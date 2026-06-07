package com.hanibe.fieldwork_101.service;

import com.hanibe.fieldwork_101.entity.Customer;
import com.hanibe.fieldwork_101.entity.User;
import com.hanibe.fieldwork_101.repository.CustomerRepository;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class CustomerService {

    private final CustomerRepository customerRepository;
    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${kakao.client-id}")
    private String kakaoClientId;

    @Getter
    @AllArgsConstructor
    private static class ExcelRowData {
        String name; String address; String phone; String modelName; String serviceType;
    }

    // 💡 1. 엑셀 업로드 (병렬처리)
    public void uploadExcel(MultipartFile file, User user) throws Exception {
        Workbook workbook = WorkbookFactory.create(file.getInputStream());
        Sheet sheet = workbook.getSheetAt(0);
        Row headerRow = sheet.getRow(0);

        int nameIdx = -1, addrIdx = -1, phoneIdx = -1, modelIdx = -1, serviceIdx = -1;
        for (Cell cell : headerRow) {
            String header = getCellValue(cell);
            if (header.equals("실사용자명")) nameIdx = cell.getColumnIndex();
            else if (header.equals("주소")) addrIdx = cell.getColumnIndex();
            else if (header.equals("휴대폰번호") || header.equals("전화번호")) phoneIdx = cell.getColumnIndex();
            else if (header.equals("모델명")) modelIdx = cell.getColumnIndex();
            else if (header.equals("서비스 타입")) serviceIdx = cell.getColumnIndex();
        }

        if (nameIdx == -1 || addrIdx == -1) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "'실사용자명'과 '주소' 열이 필요합니다.");
        }

        List<ExcelRowData> rowDataList = new ArrayList<>();
        for (int i = 1; i <= sheet.getLastRowNum(); i++) {
            Row row = sheet.getRow(i);
            if (row == null) continue;

            String name = getCellValue(row.getCell(nameIdx));
            String address = getCellValue(row.getCell(addrIdx));
            if (name.isEmpty() || address.isEmpty()) continue;

            String phone = phoneIdx != -1 ? getCellValue(row.getCell(phoneIdx)) : "";
            if (phone.endsWith(".0")) phone = phone.substring(0, phone.length() - 2);
            if (!phone.isEmpty() && !phone.startsWith("0")) phone = "0" + phone;

            String modelName = modelIdx != -1 ? getCellValue(row.getCell(modelIdx)) : "";
            String serviceType = serviceIdx != -1 ? getCellValue(row.getCell(serviceIdx)) : "";

            rowDataList.add(new ExcelRowData(name, address, phone, modelName, serviceType));
        }
        workbook.close();

        rowDataList.parallelStream().forEach(data -> {
            if (customerRepository.existsByNameAndAddressAndUserId(data.getName(), data.getAddress(), user.getId())) {
                return;
            }

            String refinedAddress = data.getAddress().replaceAll("\\(.*?\\)", "").replaceAll("\\s+", " ").trim();
            double[] coords = getCoordinatesViaKakao(refinedAddress);

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
        });
    }

    private double[] getCoordinatesViaKakao(String address) {
        String url = "https://dapi.kakao.com/v2/local/search/address.json?query=" + address;
        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", "KakaoAK " + kakaoClientId);
        HttpEntity<?> entity = new HttpEntity<>(headers);

        try {
            ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.GET, entity, Map.class);
            List<Map<String, Object>> docs = (List<Map<String, Object>>) response.getBody().get("documents");
            if (docs != null && !docs.isEmpty()) {
                double lat = Double.parseDouble(docs.get(0).get("y").toString());
                double lng = Double.parseDouble(docs.get(0).get("x").toString());
                return new double[]{lat, lng};
            }
        } catch (Exception e) {}
        return new double[]{0.0, 0.0};
    }

    private String getCellValue(Cell cell) {
        if (cell == null) return "";
        switch (cell.getCellType()) {
            case STRING: return cell.getStringCellValue().trim();
            case NUMERIC: return String.valueOf(cell.getNumericCellValue()).trim();
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
                successList.add(Map.of(
                        "id", c.getId(),
                        "name", c.getName(),
                        "address", c.getAddress(),
                        "latitude", c.getLatitude(),
                        "longitude", c.getLongitude(),
                        "phone", c.getPhone() != null ? c.getPhone() : "",
                        "status", c.getStatus() != null ? c.getStatus() : "미컨택",
                        "model_name", c.getModelName() != null ? c.getModelName() : "",
                        "service_type", c.getServiceType() != null ? c.getServiceType() : ""
                ));
            } else {
                failedList.add(Map.of(
                        "id", c.getId(),
                        "row", 0,
                        "name", c.getName(),
                        "address", c.getAddress()
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

    // 💡 4. 고객 주소 수정 (카카오 좌표 재검색)
    public Map<String, Object> updateCustomerAddress(Long customerId, String newAddress, User user) {
        Customer customer = customerRepository.findById(customerId)
                .filter(c -> c.getUser().getId().equals(user.getId()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "고객 정보를 찾을 수 없습니다."));

        String refinedAddress = newAddress.replaceAll("\\(.*?\\)", "").replaceAll("\\s+", " ").trim();
        double[] coords = getCoordinatesViaKakao(refinedAddress);

        customer.setAddress(newAddress);
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
}