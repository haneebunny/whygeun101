package com.hanibe.fieldwork_101.service;

import com.hanibe.fieldwork_101.dto.AddressCorrectionDto;
import com.hanibe.fieldwork_101.entity.Customer;
import com.hanibe.fieldwork_101.entity.User;
import com.hanibe.fieldwork_101.repository.CustomerRepository;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.util.regex.Pattern;
import java.util.regex.Matcher;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;

@Service
@RequiredArgsConstructor
public class CustomerService {

    private final CustomerRepository customerRepository;
    private final OpenAiService openAiService;
    private final RestTemplate restTemplate = createRestTemplateWithTimeout();

    private static RestTemplate createRestTemplateWithTimeout() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(5000); // 5 seconds
        factory.setReadTimeout(15000);   // 15 seconds
        return new RestTemplate(factory);
    }

    @Value("${kakao.client-id}")
    private String kakaoClientId;

    @Getter
    @AllArgsConstructor
    private static class ExcelRowData {
        String name; String address; String phone; String modelName; String serviceType;
    }

    // 💡 1. 엑셀 업로드 및 동기화 (+N -N)
    public Map<String, Integer> uploadExcel(MultipartFile file, User user) throws Exception {
        Workbook workbook = WorkbookFactory.create(file.getInputStream());
        Sheet sheet = workbook.getSheetAt(0);
        Row headerRow = sheet.getRow(0);

        int nameIdx = -1, addrIdx = -1, phoneIdx = -1, modelIdx = -1, serviceIdx = -1;
        int phonePriority = 0; // 0: 없음, 1: 일반전화(전화번호), 2: 휴대폰/핸드폰(최우선)

        for (Cell cell : headerRow) {
            String header = getCellValue(cell).trim().replace(" ", "").toLowerCase();
            if (header.contains("실사용자") || header.contains("실고객") || header.contains("고객명") || 
                header.contains("이름") || header.contains("성함") || header.contains("성명") || header.contains("사용자")) {
                nameIdx = cell.getColumnIndex();
            }
            else if (header.contains("주소") || header.contains("소재지") || header.contains("위치")) {
                addrIdx = cell.getColumnIndex();
            }
            else if (header.contains("휴대폰") || header.contains("핸드폰") || header.contains("연락처") || header.contains("폰번호")) {
                // 최우선 휴대폰 열 매칭 (우선순위 2)
                phoneIdx = cell.getColumnIndex();
                phonePriority = 2;
            }
            else if (header.contains("전화")) {
                // 휴대폰 열이 아직 매칭되지 않은 경우에만 일반전화 열 매칭 (우선순위 1)
                if (phonePriority < 2) {
                    phoneIdx = cell.getColumnIndex();
                    phonePriority = 1;
                }
            }
            else if (header.contains("모델") || header.contains("기기")) {
                modelIdx = cell.getColumnIndex();
            }
            else if (header.contains("서비스") || header.contains("타입") || header.contains("구분")) {
                serviceIdx = cell.getColumnIndex();
            }
        }

        // Fallback or validation
        if (nameIdx == -1 || addrIdx == -1) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "'고객명(이름/성함)'과 '주소' 열이 존재해야 연동할 수 있습니다.");
        }

        List<ExcelRowData> rowDataList = new ArrayList<>();
        for (int i = 1; i <= sheet.getLastRowNum(); i++) {
            Row row = sheet.getRow(i);
            if (row == null) continue;

            String name = getCellValue(row.getCell(nameIdx));
            String address = getCellValue(row.getCell(addrIdx));
            if (name.isEmpty() || address.isEmpty()) continue;

            String phone = phoneIdx != -1 ? getCellValue(row.getCell(phoneIdx)) : "";
            // 1. Remove trailing float .0 if present
            if (phone.endsWith(".0")) {
                phone = phone.substring(0, phone.length() - 2);
            }
            // 2. Clean non-numeric characters (hyphens, spaces, letters)
            phone = phone.replaceAll("[^0-9]", "").trim();
            // 3. Prepend leading 0 if missing from numeric import (e.g. 1012345678 -> 01012345678)
            if (!phone.isEmpty() && !phone.startsWith("0")) {
                phone = "0" + phone;
            }
            // 4. Strip scientific notation artifact (e.g., 010123456789 from E9)
            if (phone.length() == 12 && phone.startsWith("01") && phone.endsWith("9")) {
                phone = phone.substring(0, phone.length() - 1);
            }

            String modelName = modelIdx != -1 ? getCellValue(row.getCell(modelIdx)) : "";
            String serviceType = serviceIdx != -1 ? getCellValue(row.getCell(serviceIdx)) : "";

            rowDataList.add(new ExcelRowData(name, address, phone, modelName, serviceType));
        }
        workbook.close();

        // 1. 기존 DB 고객 정보 조회
        List<Customer> dbCustomers = customerRepository.findByUserId(user.getId());

        int addedCount = 0;
        for (ExcelRowData data : rowDataList) {
            boolean foundInDb = false;
            String cleanExcelPhone = data.getPhone().replaceAll("[^0-9]", "").trim();

            for (Customer dbc : dbCustomers) {
                String cleanDbPhone = dbc.getPhone() != null ? dbc.getPhone().replaceAll("[^0-9]", "").trim() : "";

                if (!cleanExcelPhone.isEmpty() && !cleanDbPhone.isEmpty()) {
                    // 1. 이름과 전화번호가 둘 다 있고 일치할 때 중복으로 간주
                    if (dbc.getName().equals(data.getName()) && cleanDbPhone.equals(cleanExcelPhone)) {
                        foundInDb = true;
                        break;
                    }
                } else {
                    // 2. 전화번호가 없는 경우, 이름과 주소가 일치할 때 중복으로 간주
                    if (dbc.getName().equals(data.getName()) && dbc.getAddress().equals(data.getAddress())) {
                        foundInDb = true;
                        break;
                    }
                }
            }
            if (!foundInDb) {
                double[] coords = getCoordinatesViaKakao(data.getAddress());

                Customer customer = Customer.builder()
                        .name(data.getName())
                        .address(data.getAddress())
                        .latitude(coords[0] == 0.0 ? null : coords[0])
                        .longitude(coords[1] == 0.0 ? null : coords[1])
                        .phone(data.getPhone())
                        .modelName(data.getModelName())
                        .serviceType(data.getServiceType())
                        .user(user)
                        .build();

                customerRepository.save(customer);
                addedCount++;
            }
        }

        return Map.of("addedCount", addedCount, "deletedCount", 0);
    }

    private double[] getCoordinatesViaKakao(String address) {
        if (address == null || address.trim().isEmpty()) {
            return new double[]{0.0, 0.0};
        }

        // 0단계: 아파트/단지명 우선 키워드 지오코딩 시도
        String bldName = extractBuildingName(address);
        String regionPrefix = extractRegionPrefix(address);
        if (!bldName.isEmpty() && !regionPrefix.isEmpty()) {
            double[] coords = callKakaoKeywordApi(regionPrefix + " " + bldName);
            if (coords[0] != 0.0 && coords[1] != 0.0) {
                return coords;
            }
        }

        // 1단계: 원본 주소 그대로 지오코딩 시도 (A)
        String rawClean = address.replaceAll("\\(.*?\\)", "").replaceAll("\\s+", " ").trim();
        double[] coords = callKakaoApi(rawClean);
        if (coords[0] != 0.0 && coords[1] != 0.0) {
            return coords;
        }

        // 2단계: 룰 기반 정제 후 지오코딩 시도 (B)
        String refinedRuleAddress = refineAddressRuleBased(rawClean);
        if (refinedRuleAddress != null && !refinedRuleAddress.isEmpty()) {
            coords = callKakaoApi(refinedRuleAddress);
            if (coords[0] != 0.0 && coords[1] != 0.0) {
                return coords;
            }
        }

        // 3단계: LLM 호출을 통한 지오코딩 시도 (C)
        String preprocessed = preprocessAttachedNumbers(address);
        try {
            List<OpenAiService.RefinedCandidate> llmCandidates = openAiService.suggestCorrections(preprocessed);
            for (OpenAiService.RefinedCandidate lc : llmCandidates) {
                coords = callKakaoApi(lc.refinedAddress);
                if (coords[0] != 0.0 && coords[1] != 0.0) {
                    return coords;
                }
            }
        } catch (Exception e) {
            System.err.println("Fallback LLM geocoding failed: " + e.getMessage());
        }

        return new double[]{0.0, 0.0};
    }

    private double[] callKakaoApi(String queryAddress) {
        if (queryAddress == null || queryAddress.trim().isEmpty()) {
            return new double[]{0.0, 0.0};
        }
        String cleanQuery = queryAddress.trim();
        if (cleanQuery.contains(",")) {
            cleanQuery = cleanQuery.split(",")[0].trim();
        }

        // 단순 광역자치단체명 단독 질의 시 좌표 반환 차단 (서울시청 핀 방지)
        if (cleanQuery.matches("^(서울특별시|서울시|서울|경기도|경기|인천광역시|인천|강원도|강원|충청북도|충북|충청남도|충남|전라북도|전북|전라남도|전남|경상북도|경북|경상남도|경남|제주특별자치도|제주도|제주|부산광역시|부산|대구광역시|대구|대전광역시|대전|광주광역시|광주|울산광역시|울산|세종특별자치시|세종)$")) {
            return new double[]{0.0, 0.0};
        }

        String url = "https://dapi.kakao.com/v2/local/search/address.json?query=" + cleanQuery;
        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", "KakaoAK " + kakaoClientId);
        HttpEntity<?> entity = new HttpEntity<>(headers);

        try {
            ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.GET, entity, Map.class);
            List<Map<String, Object>> docs = (List<Map<String, Object>>) response.getBody().get("documents");
            if (docs != null && !docs.isEmpty()) {
                String addressType = (String) docs.get(0).get("address_type");
                // REGION(단순 행정구역 중심점)은 개별 고객 건물의 실제 위치가 아니므로 무효 처리
                if (!"REGION".equalsIgnoreCase(addressType)) {
                    double lat = Double.parseDouble(docs.get(0).get("y").toString());
                    double lng = Double.parseDouble(docs.get(0).get("x").toString());
                    return new double[]{lat, lng};
                }
            }

            // 💡 [폴백] 주소 API 결과가 없을 경우 카카오 로컬 키워드 API로 2차 시도 (유명 아파트명/건물명 대응)
            return callKakaoKeywordApi(cleanQuery);
        } catch (Exception e) {}
        return new double[]{0.0, 0.0};
    }

    private double[] callKakaoKeywordApi(String query) {
        if (query == null || query.trim().isEmpty()) {
            return new double[]{0.0, 0.0};
        }
        String cleanQuery = query.trim();
        String keywordUrl = "https://dapi.kakao.com/v2/local/search/keyword.json?query=" + cleanQuery;
        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", "KakaoAK " + kakaoClientId);
        HttpEntity<?> entity = new HttpEntity<>(headers);

        try {
            ResponseEntity<Map> kwResponse = restTemplate.exchange(keywordUrl, HttpMethod.GET, entity, Map.class);
            List<Map<String, Object>> kwDocs = (List<Map<String, Object>>) kwResponse.getBody().get("documents");
            if (kwDocs != null && !kwDocs.isEmpty()) {
                String pname = (String) kwDocs.get(0).get("place_name");
                if (pname != null && (pname.contains("시청") || pname.contains("구청")) && !cleanQuery.contains("시청") && !cleanQuery.contains("구청")) {
                    return new double[]{0.0, 0.0};
                }
                double lat = Double.parseDouble(kwDocs.get(0).get("y").toString());
                double lng = Double.parseDouble(kwDocs.get(0).get("x").toString());
                return new double[]{lat, lng};
            }
        } catch (Exception e) {}
        return new double[]{0.0, 0.0};
    }

    private String extractRegionPrefix(String address) {
        if (address == null) return "서울 강동구";
        Pattern pattern = Pattern.compile("^(서울(?:특별시)?\\s+[가-힣]+구|[가-힣]+(?:도|시|군|구)\\s+[가-힣]+(?:시|군|구))");
        Matcher matcher = pattern.matcher(address.trim());
        if (matcher.find()) {
            return matcher.group(1);
        }
        return "서울 강동구";
    }

    private String extractBuildingName(String address) {
        if (address == null || address.trim().isEmpty()) return "";

        // 1. 괄호 안 확인 (예: (고덕동, 고덕그라시움아파트), (암사동, 강동 롯데캐슬퍼스트아파트), (명일동, 래미안 솔베뉴))
        Matcher matcherParen = Pattern.compile("\\((.*?)\\)").matcher(address);
        while (matcherParen.find()) {
            String content = matcherParen.group(1).trim();
            String[] parts = content.split(",");
            for (String p : parts) {
                String item = p.trim();
                // 단순 법정동명 (예: 고덕동, 암사동) 제외
                if (item.matches("^[가-힣]{1,4}(동|읍|면|리)$")) {
                    continue;
                }
                String cleanItem = item.replaceAll("^[가-힣]{1,4}(동|읍|면|리)\\s+", "").trim();
                if (!cleanItem.isEmpty()) {
                    return cleanItem;
                } else if (item.length() >= 2 && !item.matches("\\d+")) {
                    return item;
                }
            }
        }

        // 2. 쉼표 뒤 확인 (예: 강일동, 강동리버스트6단지 / 길동, 베네시티)
        Matcher matcherComma = Pattern.compile(",\\s*([가-힣0-9a-zA-Z\\s]+)$").matcher(address);
        if (matcherComma.find()) {
            String cand = matcherComma.group(1).trim();
            if (!cand.matches("^[가-힣]{1,4}(동|읍|면|리)$")) {
                return cand;
            }
        }

        // 3. 법정동 뒤에 붙은 아파트명 (예: 명일동, 한양아파트 / 길동160번지 헤리티지자이)
        Matcher matcherTail = Pattern.compile("([가-힣]{1,4}(동|리))[\\s,]+([가-힣0-9a-zA-Z\\s]+?(아파트|단지|빌라|맨션|오피스텔|타운|자이|힐스테이트|아이파크|캐슬|푸르지오|더샵|파밀리에|수자인|베네시티|하우스|하이츠|노블하임|빌|팰리스|마을))").matcher(address);
        if (matcherTail.find()) {
            return matcherTail.group(3).trim();
        }

        // 4. 일반 아파트/단지/빌라 키워드 매칭
        Matcher matcherGen = Pattern.compile("([가-힣0-9a-zA-Z]{2,15}(?:아파트|단지|빌라|맨션|오피스텔|타운|자이|힐스테이트|아이파크|롯데캐슬|푸르지오|더샵|파밀리에|수자인|베네시티|노블하임))").matcher(address);
        if (matcherGen.find()) {
            String cand = matcherGen.group(1).trim();
            if (!cand.matches(".*(특별시|광역시|특별자치시|구|로|길)$")) {
                return cand;
            }
        }

        return "";
    }

    private String extractDongHo(String address) {
        if (address == null || address.trim().isEmpty()) return "";

        // 1. 101동 1001호 / 101동1001호
        Matcher m1 = Pattern.compile("(\\d{1,4}\\s*동)\\s*(\\d{1,4}\\s*호)").matcher(address);
        if (m1.find()) {
            return m1.group(1).replace(" ", "") + " " + m1.group(2).replace(" ", "");
        }

        // 2. 붙어있는 동호수 (예: 603동1007호 / 77603동1007호 -> 603동 1007호)
        Matcher m2 = Pattern.compile("(\\d{3,6})동\\s*(\\d{1,4})호?").matcher(address);
        if (m2.find()) {
            String d = m2.group(1);
            if (d.length() >= 4) {
                d = d.substring(d.length() - 3);
            }
            String h = m2.group(2);
            if (!h.endsWith("호")) h += "호";
            return d + "동 " + h;
        }

        // 3. 하이픈 동-호수 (예: 204-1702, 106-402)
        Matcher m3 = Pattern.compile("\\b(\\d{1,4})-(\\d{3,4})\\b").matcher(address);
        if (m3.find()) {
            return m3.group(1) + "동 " + m3.group(2) + "호";
        }

        // 4. 층수 + 호수 (예: 1층 102호)
        Matcher m4 = Pattern.compile("(\\d+층)\\s*(\\d+호)").matcher(address);
        if (m4.find()) {
            return m4.group(1) + " " + m4.group(2);
        }

        // 5. 가동/나동/A동/B동 + 호수
        Matcher m5 = Pattern.compile("([가-힣A-Za-z]\\s*동)\\s*(\\d+호)").matcher(address);
        if (m5.find()) {
            return m5.group(1).replace(" ", "") + " " + m5.group(2);
        }

        // 6. 호수 매칭 (예: 18602호 -> 602호, 189908호 -> 908호, 402호 -> 402호)
        Matcher m6 = Pattern.compile("(\\d{1,6})\\s*호").matcher(address);
        if (m6.find()) {
            String hoStr = m6.group(1);
            if (hoStr.length() >= 5) {
                return hoStr.substring(hoStr.length() - 3) + "호";
            }
            return hoStr + "호";
        }

        // 7. 층수만 있는 경우 (예: 65층 -> 5층)
        Matcher m7 = Pattern.compile("(\\d+)층").matcher(address);
        if (m7.find()) {
            String floor = m7.group(1);
            if (floor.length() > 1) {
                floor = floor.substring(floor.length() - 1);
            }
            return floor + "층";
        }

        // 8. 동만 있는 경우 (예: 101동)
        Matcher m8 = Pattern.compile("(\\d{1,6})동").matcher(address);
        if (m8.find()) {
            String d = m8.group(1);
            if (d.length() >= 4) {
                d = d.substring(d.length() - 3);
            }
            return d + "동";
        }

        return "";
    }

    private String preprocessAttachedNumbers(String address) {
        if (address == null) return "";
        Pattern pattern = Pattern.compile("(\\d+)동");
        Matcher matcher = pattern.matcher(address);
        StringBuilder sb = new StringBuilder();
        while (matcher.find()) {
            String numStr = matcher.group(1);
            if (numStr.length() >= 4) {
                String replacement = numStr.substring(0, numStr.length() - 3) + " " + numStr.substring(numStr.length() - 3) + "동";
                matcher.appendReplacement(sb, Matcher.quoteReplacement(replacement));
            } else {
                matcher.appendReplacement(sb, Matcher.quoteReplacement(matcher.group(0)));
            }
        }
        matcher.appendTail(sb);
        return sb.toString();
    }

    private String refineAddressRuleBased(String address) {
        String cleaned = address.replaceAll("\\(.*?\\)", "").trim();

        // 1. 아파트 동+호수 매칭 (예: 130105동 2102호 ➡️ 건물번호 130 복원)
        Pattern patternDongHo = Pattern.compile("(\\d+|[A-Za-z]|가|나|다|라)\\s*동(?!구)\\s*(\\d+)\\s*호?");
        Matcher matcherDongHo = patternDongHo.matcher(cleaned);
        if (matcherDongHo.find()) {
            String dongStr = matcherDongHo.group(1);
            int matchStart = matcherDongHo.start();
            if (dongStr.matches("\\d+") && dongStr.length() >= 4) {
                String roadPrefix = dongStr.substring(0, dongStr.length() - 3);
                return cleanRoadCandidate(cleaned.substring(0, matchStart).trim() + " " + roadPrefix);
            } else {
                return cleanRoadCandidate(cleaned.substring(0, matchStart).trim());
            }
        }

        // 💡 [패턴 A] 하이픈 앞 숫자가 5자리 이상 (예: 70701-1415 ➡️ 건물번호 70)
        Pattern patternConcatDong = Pattern.compile("\\b(\\d{1,3})(\\d{3})-(\\d{3,4})\\b");
        Matcher matcherConcatDong = patternConcatDong.matcher(cleaned);
        if (matcherConcatDong.find()) {
            String bldNum = matcherConcatDong.group(1);
            return cleanRoadCandidate(cleaned.substring(0, matcherConcatDong.start()).trim() + " " + bldNum);
        }

        // 💡 [패턴 B] 하이픈 뒤 숫자가 5자리 이상 (예: 20-18202호 ➡️ 건물번호 20-18)
        Pattern patternConcatHo = Pattern.compile("\\b(\\d+)-(\\d{1,3})(\\d{3})호?\\b");
        Matcher matcherConcatHo = patternConcatHo.matcher(cleaned);
        if (matcherConcatHo.find()) {
            String mainBld = matcherConcatHo.group(1);
            String subBld = matcherConcatHo.group(2);
            return cleanRoadCandidate(cleaned.substring(0, matcherConcatHo.start()).trim() + " " + mainBld + "-" + subBld);
        }

        // 💡 [패턴 C] 건물번호 + 3자리 호수 (예: 18602호 ➡️ 건물번호 18, 602호)
        Pattern patternConcatBldHo = Pattern.compile("(\\d{1,4})(\\d{3})호");
        Matcher matcherConcatBldHo = patternConcatBldHo.matcher(cleaned);
        if (matcherConcatBldHo.find()) {
            String bldNum = matcherConcatBldHo.group(1);
            return cleanRoadCandidate(cleaned.substring(0, matcherConcatBldHo.start()).trim() + " " + bldNum);
        }

        // 💡 [패턴 D] 건물번호 + 층수 (예: 65층암사동 ➡️ 건물번호 6, 5층 / 2091층성내동 ➡️ 건물번호 209, 1층)
        Pattern patternConcatBldFloor = Pattern.compile("(\\d+?)(\\d)층");
        Matcher matcherConcatBldFloor = patternConcatBldFloor.matcher(cleaned);
        if (matcherConcatBldFloor.find()) {
            String bldNum = matcherConcatBldFloor.group(1);
            return cleanRoadCandidate(cleaned.substring(0, matcherConcatBldFloor.start()).trim() + " " + bldNum);
        }

        // 💡 [패턴 E] 건물번호 뒤 하이픈 동-호수 (예: 양재대로 1650 106-402 ➡️ 건물번호 1650)
        Pattern patternBldHyphen = Pattern.compile("\\b(\\d{1,4})\\s+(\\d{1,4}-\\d{1,4})\\b");
        Matcher matcherBldHyphen = patternBldHyphen.matcher(cleaned);
        if (matcherBldHyphen.find()) {
            String bldNum = matcherBldHyphen.group(1);
            return cleanRoadCandidate(cleaned.substring(0, matcherBldHyphen.start()).trim() + " " + bldNum);
        }

        // 2. 단일 동/호 매칭 (강동구, 성동구 등 행정구 오인 방지: 동(?!구) 및 숫자/단일문자 동만 허용)
        Pattern patternDong = Pattern.compile("(\\d+|[A-Za-z]|가|나|다|라)\\s*동(?!구)");
        Pattern patternHo = Pattern.compile("(\\d+)\\s*호");
        Matcher matcherDong = patternDong.matcher(cleaned);
        Matcher matcherHo = patternHo.matcher(cleaned);

        boolean hasDong = matcherDong.find();
        boolean hasHo = matcherHo.find();

        if (hasDong && hasHo) {
            String dongStr = matcherDong.group(1);
            int startIdx = Math.min(matcherDong.start(), matcherHo.start());
            if (dongStr.matches("\\d+") && dongStr.length() >= 4) {
                String roadPrefix = dongStr.substring(0, dongStr.length() - 3);
                return cleanRoadCandidate(cleaned.substring(0, startIdx).trim() + " " + roadPrefix);
            } else {
                return cleanRoadCandidate(cleaned.substring(0, startIdx).trim());
            }
        } else if (hasHo) {
            return cleanRoadCandidate(cleaned.substring(0, matcherHo.start()).trim());
        } else if (hasDong) {
            String dongStr = matcherDong.group(1);
            int startIdx = matcherDong.start();
            if (dongStr.matches("\\d+") && dongStr.length() >= 4) {
                String roadPrefix = dongStr.substring(0, dongStr.length() - 3);
                return cleanRoadCandidate(cleaned.substring(0, startIdx).trim() + " " + roadPrefix);
            } else {
                return cleanRoadCandidate(cleaned.substring(0, startIdx).trim());
            }
        }

        // 3. 하이픈 패턴 (\b\d{1,4}-\d{3,4}\b)
        Pattern patternHyphen = Pattern.compile("\\b(\\d{1,4})-(\\d{3,4})\\b");
        Matcher matcherHyphen = patternHyphen.matcher(cleaned);
        if (matcherHyphen.find()) {
            return cleanRoadCandidate(cleaned.substring(0, matcherHyphen.start()).trim());
        }

        return cleanRoadCandidate(cleaned);
    }

    private String cleanRoadCandidate(String roadCandidate) {
        String result = roadCandidate.replaceAll("\\s+", " ").trim();
        
        // 시 축약 보정
        String[] tokens = result.split(" ");
        if (tokens.length > 0) {
            if ("서울".equals(tokens[0])) {
                tokens[0] = "서울특별시";
            } else if ("경기".equals(tokens[0])) {
                tokens[0] = "경기도";
            } else if ("인천".equals(tokens[0])) {
                tokens[0] = "인천광역시";
            }
            result = String.join(" ", tokens);
        }
        return result;
    }

    private String mergeWithOriginalDetail(String originalAddress, String newAddress) {
        if (originalAddress == null || originalAddress.trim().isEmpty()) {
            return newAddress != null ? newAddress : "";
        }
        if (newAddress == null || newAddress.trim().isEmpty()) {
            return originalAddress;
        }

        String cleanRoad = newAddress.split(",")[0].trim();
        String detailExisting = newAddress.contains(",") ? newAddress.substring(newAddress.indexOf(",") + 1).trim() : "";

        // 이미 상세주소(동/호/층)가 newAddress에 포함되어 있다면 그대로 반환
        Pattern detailPattern = Pattern.compile("(\\d+동|\\d+호|\\d+층|\\d+-\\d+)");
        if (detailPattern.matcher(detailExisting).find()) {
            return newAddress;
        }

        String bldName = extractBuildingName(originalAddress);
        String dongHo = extractDongHo(originalAddress);

        List<String> detailList = new ArrayList<>();
        if (bldName != null && !bldName.isEmpty() && !cleanRoad.contains(bldName)) {
            detailList.add(bldName);
        }
        if (dongHo != null && !dongHo.isEmpty()) {
            detailList.add(dongHo);
        }

        if (!detailList.isEmpty()) {
            return cleanRoad + ", " + String.join(" ", detailList);
        }

        // 동호수나 아파트명이 추출되지 않은 경우 원본 상세주소 부분 보존 시도
        String originalRoad = refineAddressRuleBased(originalAddress);
        String detailPart = originalAddress.replace(originalRoad, "").replaceAll("\\(.*?\\)", "").replaceAll("\\s+", " ").trim();
        if (!detailPart.isEmpty() && !detailPart.equals(originalAddress)) {
            detailPart = detailPart.replaceAll("^[^a-zA-Z0-9가-힣]+", "").trim();
            if (!detailPart.isEmpty() && !cleanRoad.contains(detailPart)) {
                return cleanRoad + ", " + detailPart;
            }
        }

        return cleanRoad;
    }

    private final org.apache.poi.ss.usermodel.DataFormatter dataFormatter = new org.apache.poi.ss.usermodel.DataFormatter();

    private String getCellValue(Cell cell) {
        if (cell == null) return "";
        switch (cell.getCellType()) {
            case STRING: return cell.getStringCellValue().trim();
            case NUMERIC: return dataFormatter.formatCellValue(cell).trim();
            default: return "";
        }
    }

    // 💡 2. 고객 전체 조회 (성공/실패 분리)
    public Map<String, Object> getCustomers(User user) {
        List<Customer> allCustomers = customerRepository.findByUserId(user.getId());

        List<Map<String, Object>> successList = new ArrayList<>();
        List<Map<String, Object>> failedList = new ArrayList<>();

        for (Customer c : allCustomers) {
            if (c.getLatitude() != null && c.getLongitude() != null) {
                successList.add(Map.ofEntries(
                        Map.entry("id", c.getId()),
                        Map.entry("name", c.getName()),
                        Map.entry("address", c.getAddress()),
                        Map.entry("latitude", c.getLatitude()),
                        Map.entry("longitude", c.getLongitude()),
                        Map.entry("phone", c.getPhone() != null ? c.getPhone() : ""),
                        Map.entry("status", c.getStatus() != null ? c.getStatus() : "미컨택"),
                        Map.entry("model_name", c.getModelName() != null ? c.getModelName() : ""),
                        Map.entry("service_type", c.getServiceType() != null ? c.getServiceType() : ""),
                        Map.entry("favorite", c.getFavorite() != null ? c.getFavorite() : false),
                        Map.entry("absent", c.getAbsent() != null ? c.getAbsent() : false),
                        Map.entry("visit_time", c.getVisitTime() != null ? c.getVisitTime() : ""),
                        Map.entry("memo", c.getMemo() != null ? c.getMemo() : "")
                ));
            } else {
                failedList.add(Map.of(
                        "id", c.getId(),
                        "row", 0,
                        "name", c.getName(),
                        "address", c.getAddress(),
                        "favorite", c.getFavorite() != null ? c.getFavorite() : false,
                        "absent", c.getAbsent() != null ? c.getAbsent() : false,
                        "visit_time", c.getVisitTime() != null ? c.getVisitTime() : "",
                        "memo", c.getMemo() != null ? c.getMemo() : ""
                ));
            }
        }
        return Map.of("success_list", successList, "failed_list", failedList);
    }

    // 💡 3. 고객 상태 업데이트
    public void updateCustomerStatus(Long customerId, String status, User user) {
        Customer customer = customerRepository.findById(customerId)
                .filter(c -> c.getUser().getId().equals(user.getId()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "고객을 찾을 수 없습니다."));

        customer.setStatus(status);
        customerRepository.save(customer);
    }

    // 💡 7. 고객 즐겨찾기 상태 토글
    public void updateCustomerFavorite(Long customerId, boolean favorite, User user) {
        Customer customer = customerRepository.findById(customerId)
                .filter(c -> c.getUser().getId().equals(user.getId()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "고객을 찾을 수 없습니다."));

        customer.setFavorite(favorite);
        customerRepository.save(customer);
    }

    // 💡 7-2. 고객 부재중 상태 토글
    public void updateCustomerAbsent(Long customerId, boolean absent, User user) {
        Customer customer = customerRepository.findById(customerId)
                .filter(c -> c.getUser().getId().equals(user.getId()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "고객을 찾을 수 없습니다."));

        customer.setAbsent(absent);
        customerRepository.save(customer);
    }

    // 💡 8. 고객 방문 시간 업데이트
    public void updateCustomerVisitTime(Long customerId, String visitTime, User user) {
        Customer customer = customerRepository.findById(customerId)
                .filter(c -> c.getUser().getId().equals(user.getId()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "고객을 찾을 수 없습니다."));

        customer.setVisitTime(visitTime);
        customerRepository.save(customer);
    }

    // 💡 4. 고객 주소 수정 (카카오 좌표 재검색)
    public Map<String, Object> updateCustomerAddress(Long customerId, String newAddress, User user) {
        Customer customer = customerRepository.findById(customerId)
                .filter(c -> c.getUser().getId().equals(user.getId()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "고객 정보를 찾을 수 없습니다."));

        String mergedAddress = mergeWithOriginalDetail(customer.getAddress(), newAddress);
        double[] coords = getCoordinatesViaKakao(mergedAddress);

        customer.setAddress(mergedAddress);
        customer.setLatitude(coords[0] == 0.0 ? null : coords[0]);
        customer.setLongitude(coords[1] == 0.0 ? null : coords[1]);
        customerRepository.save(customer);

        boolean isSuccess = coords[0] != 0.0 && coords[1] != 0.0;
        return Map.of(
                "success", isSuccess,
                "customer", Map.of(
                        "id", customer.getId(),
                        "name", customer.getName(),
                        "address", customer.getAddress(),
                        "latitude", customer.getLatitude(),
                        "longitude", customer.getLongitude()
                )
        );
    }

    // 💡 5. 고객 1명 삭제
    public void deleteCustomer(Long customerId, User user) {
        Customer customer = customerRepository.findById(customerId)
                .filter(c -> c.getUser().getId().equals(user.getId()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "고객을 찾을 수 없습니다."));
        customerRepository.delete(customer);
    }

    // 💡 6. 나의 모든 데이터 초기화 (전체 삭제)
    public void deleteAllCustomers(User user) {
        List<Customer> myCustomers = customerRepository.findByUserId(user.getId());
        customerRepository.deleteAll(myCustomers);
    }

    public void updateCustomerMemo(Long customerId, String memo, User user) {
        Customer customer = customerRepository.findById(customerId)
                .filter(c -> c.getUser().getId().equals(user.getId()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "고객을 찾을 수 없습니다."));
        customer.setMemo(memo);
        customerRepository.save(customer);
    }

    public Customer addCustomer(com.hanibe.fieldwork_101.dto.CustomerAddRequest request, User user) {
        double[] coords = getCoordinatesViaKakao(request.getAddress());

        Customer customer = Customer.builder()
                .name(request.getName())
                .address(request.getAddress())
                .phone(request.getPhone())
                .modelName(request.getModelName())
                .serviceType(request.getServiceType())
                .latitude(coords[0] == 0.0 ? null : coords[0])
                .longitude(coords[1] == 0.0 ? null : coords[1])
                .user(user)
                .build();

        return customerRepository.save(customer);
    }

    // 💡 7. 실시간 지역/날씨 조회 (Kakao Coord2RegionCode + Open-Meteo - 3시간 뒤 예보)
    public Map<String, Object> getWeatherData(Double lat, Double lng) {
        if (lat == null || lng == null) {
            // Default to Seoul City Hall
            lat = 37.5665;
            lng = 126.9780;
        }

        String regionName = "서울시";
        String kakaoUrl = "https://dapi.kakao.com/v2/local/geo/coord2regioncode.json?x=" + lng + "&y=" + lat;
        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", "KakaoAK " + kakaoClientId);
        HttpEntity<?> entity = new HttpEntity<>(headers);

        try {
            ResponseEntity<Map> response = restTemplate.exchange(kakaoUrl, HttpMethod.GET, entity, Map.class);
            List<Map<String, Object>> docs = (List<Map<String, Object>>) response.getBody().get("documents");
            if (docs != null && !docs.isEmpty()) {
                Map<String, Object> doc = docs.get(0);
                for (Map<String, Object> d : docs) {
                    if ("H".equals(d.get("region_type"))) {
                        doc = d;
                        break;
                    }
                }
                String depth2 = (String) doc.get("region_2depth_name");
                String depth3 = (String) doc.get("region_3depth_name");
                regionName = depth2 + " " + depth3;
            }
        } catch (Exception e) {
            System.err.println("Kakao reverse geocoding failed: " + e.getMessage());
        }

        double temp = 20.0;
        int weatherCode = 0;
        String openMeteoUrl = String.format(
            "https://api.open-meteo.com/v1/forecast?latitude=%f&longitude=%f&hourly=temperature_2m,weather_code&timezone=auto",
            lat, lng
        );

        String targetHourStr = "3시간 뒤";
        try {
            ResponseEntity<Map> response = restTemplate.getForEntity(openMeteoUrl, Map.class);
            Map<String, Object> body = response.getBody();
            if (body != null) {
                String tz = body.containsKey("timezone") ? body.get("timezone").toString() : "Asia/Seoul";
                Map<String, Object> hourly = (Map<String, Object>) body.get("hourly");
                if (hourly != null) {
                    List<String> timeList = (List<String>) hourly.get("time");
                    List<?> tempList = (List<?>) hourly.get("temperature_2m");
                    List<?> codeList = (List<?>) hourly.get("weather_code");

                    if (timeList != null && tempList != null && codeList != null) {
                        LocalDateTime localNow = LocalDateTime.now(ZoneId.of(tz));
                        LocalDateTime targetTime = localNow.plusHours(3);
                        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:00");
                        String targetTimeStr = targetTime.format(formatter);
                        targetHourStr = targetTime.format(DateTimeFormatter.ofPattern("HH:00"));

                        int targetIndex = -1;
                        for (int i = 0; i < timeList.size(); i++) {
                            if (timeList.get(i).startsWith(targetTimeStr)) {
                                targetIndex = i;
                                break;
                            }
                        }

                        if (targetIndex == -1 || targetIndex >= tempList.size()) {
                            // fallback to current local hour + 3 if timezone alignment failed
                            targetIndex = localNow.getHour() + 3;
                        }

                        if (targetIndex >= 0 && targetIndex < tempList.size()) {
                            temp = Double.parseDouble(tempList.get(targetIndex).toString());
                            weatherCode = Integer.parseInt(codeList.get(targetIndex).toString());
                        }
                    }
                }
            }
        } catch (Exception e) {
            System.err.println("Open-Meteo weather fetch failed: " + e.getMessage());
        }

        String condition = getWeatherCondition(weatherCode);

        return Map.of(
            "temp", Math.round(temp),
            "condition", condition,
            "region", regionName,
            "weatherCode", weatherCode,
            "targetHour", targetHourStr
        );
    }

    private String getWeatherCondition(int code) {
        if (code == 0) return "맑음";
        if (code >= 1 && code <= 3) return "구름조금";
        if (code == 45 || code == 48) return "안개";
        if (code >= 51 && code <= 55) return "이슬비";
        if (code >= 61 && code <= 65) return "비";
        if (code >= 71 && code <= 75) return "눈";
        if (code >= 80 && code <= 82) return "소나기";
        if (code >= 95 && code <= 99) return "뇌우";
        return "흐림";
    }

    // 💡 9. 주소 보정 실패 고객 목록 조회 (OpenAI 호출 없이 인적정보만 신속 리턴)
    public List<AddressCorrectionDto> getAddressCorrections(User user) {
        List<Customer> allCustomers = customerRepository.findByUserId(user.getId());
        List<AddressCorrectionDto> result = new ArrayList<>();

        for (Customer c : allCustomers) {
            // 위경도가 null인 주소 보정 실패 고객만 추출
            if (c.getLatitude() == null || c.getLongitude() == null) {
                result.add(AddressCorrectionDto.builder()
                        .customerId(c.getId())
                        .name(c.getName())
                        .originalAddress(c.getAddress())
                        .candidates(new ArrayList<>()) // 후보군은 비동기로 개별 요청함
                        .build());
            }
        }
        return result;
    }

    // 💡 9-2. 특정 고객의 주소 보정 후보군 개별 조회 (비동기 Lazy Loading용)
    public AddressCorrectionDto getCustomerCorrectionCandidates(Long customerId, User user) {
        Customer c = customerRepository.findById(customerId)
                .filter(cust -> cust.getUser().getId().equals(user.getId()))
                .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(
                        org.springframework.http.HttpStatus.NOT_FOUND, "고객을 찾을 수 없습니다."));

        List<OpenAiService.RefinedCandidate> llmCandidates = openAiService.suggestCorrections(c.getAddress());
        List<AddressCorrectionDto.Candidate> validCandidates = new ArrayList<>();

        for (OpenAiService.RefinedCandidate lc : llmCandidates) {
            String merged = mergeWithOriginalDetail(c.getAddress(), lc.refinedAddress);
            double[] coords = getCoordinatesViaKakao(merged);
            if (coords[0] != 0.0 && coords[1] != 0.0) {
                validCandidates.add(AddressCorrectionDto.Candidate.builder()
                        .refinedAddress(merged)
                        .confidence(lc.confidence)
                        .build());
            }
        }

        return AddressCorrectionDto.builder()
                .customerId(c.getId())
                .name(c.getName())
                .originalAddress(c.getAddress())
                .candidates(validCandidates)
                .build();
    }

    // 💡 10. 신뢰도 높음(HIGH) 주소 자동 일괄 적용
    public Map<String, Integer> applyCorrectionsBulk(User user) {
        List<Customer> allCustomers = customerRepository.findByUserId(user.getId());
        int updatedCount = 0;

        for (Customer c : allCustomers) {
            if (c.getLatitude() == null || c.getLongitude() == null) {
                List<OpenAiService.RefinedCandidate> llmCandidates = openAiService.suggestCorrections(c.getAddress());
                for (OpenAiService.RefinedCandidate lc : llmCandidates) {
                    // 신뢰도가 HIGH인 후보만 대상
                    if ("HIGH".equalsIgnoreCase(lc.confidence)) {
                        String merged = mergeWithOriginalDetail(c.getAddress(), lc.refinedAddress);
                        double[] coords = getCoordinatesViaKakao(merged);
                        if (coords[0] != 0.0 && coords[1] != 0.0) {
                            c.setAddress(merged);
                            c.setLatitude(coords[0]);
                            c.setLongitude(coords[1]);
                            customerRepository.save(c);
                            updatedCount++;
                            break; // 첫 번째 일치하는 HIGH 후보를 적용 후 루프 탈출
                        }
                    }
                }
            }
        }
        return Map.of("updatedCount", updatedCount);
    }
}