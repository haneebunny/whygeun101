package com.hanibe.fieldwork_101.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
public class OpenAiService {

    @Value("${openai.api-key}")
    private String apiKey;

    @Value("${openai.model:gpt-4o-mini}")
    private String modelName;

    private final RestTemplate restTemplate = createRestTemplateWithTimeout();
    private final ObjectMapper objectMapper = new ObjectMapper();

    private static RestTemplate createRestTemplateWithTimeout() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(5000); // 5 seconds
        factory.setReadTimeout(15000);   // 15 seconds
        return new RestTemplate(factory);
    }
    private final Map<String, List<RefinedCandidate>> suggestionCache = new ConcurrentHashMap<>();

    public static class RefinedCandidate {
        public String refinedAddress;
        public String confidence; // HIGH, MEDIUM, LOW
    }

    public List<RefinedCandidate> suggestCorrections(String originalAddress) {
        if (originalAddress == null || originalAddress.trim().isEmpty()) {
            return new ArrayList<>();
        }
        String cleanAddress = originalAddress.trim();
        if (suggestionCache.containsKey(cleanAddress)) {
            return suggestionCache.get(cleanAddress);
        }

        if (apiKey == null || apiKey.trim().isEmpty()) {
            System.err.println("OpenAI API Key is not configured. Returning empty suggestions.");
            return new ArrayList<>();
        }

        String url = "https://api.openai.com/v1/chat/completions";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("Authorization", "Bearer " + apiKey);

        String systemPrompt = "너는 한국의 주소를 정규화하고 교정하는 AI 전문 비서야. " +
                "사용자가 제공한 오타가 있거나, 지저분하거나, 잘못 쓰인 한국 주소를 분석해서, " +
                "실제 카카오맵이나 네이버 지도 등 주소 검색 엔진이 성공적으로 위경도 좌표로 바꿀 수 있는 표준 도로명 주소 또는 지번 주소 후보를 1개에서 최대 2개 추천해줘. " +
                "원래 주소에 아파트명, 단지명, 건물명(예: 고덕그라시움아파트, 래미안힐스테이트, 선사현대아파트 등)과 상세 층수, 호수, 동(예: 115동 1401호, 3층 등)이 포함되어 있다면 절대 이를 유실하거나 생략하지 말고, 표준 도로명/지번 뒤에 반드시 쉼표(`,`)를 붙이고 [아파트명 동 호수] 형태로 상세 정보를 온전히 이어서 적어줘. " +
                "예를 들어, '서울 강동구 고덕로 333 (고덕동, 고덕그라시움아파트)115동 1401호'는 '서울 강동구 고덕로 333, 고덕그라시움아파트 115동 1401호'와 같이 도로명 뒤에 쉼표와 함께 아파트명과 동호수를 붙여야 해. " +
                "결과는 반드시 다음 형태의 JSON 배열 구조로만 대답해줘. 어떠한 부가 설명이나 Markdown 백틱 기호(```json 등)도 포함하지 말고, 순수 JSON 문자열만 리턴해. " +
                "[{\"refinedAddress\": \"서울 강동구 고덕로 333, 고덕그라시움아파트 115동 1401호\", \"confidence\": \"HIGH\"}] " +
                "신뢰도(confidence)는 HIGH(보정이 아주 명확함), MEDIUM(일부 추정 필요), LOW(불명확함) 중 하나여야 해.";

        Map<String, Object> requestBody = Map.of(
                "model", modelName,
                "messages", List.of(
                        Map.of("role", "system", "content", systemPrompt),
                        Map.of("role", "user", "content", "원본 주소: " + originalAddress)
                ),
                "temperature", 0.1
        );

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

        try {
            ResponseEntity<Map> response = restTemplate.postForEntity(url, entity, Map.class);
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                List<Map<String, Object>> choices = (List<Map<String, Object>>) response.getBody().get("choices");
                if (choices != null && !choices.isEmpty()) {
                    Map<String, Object> message = (Map<String, Object>) choices.get(0).get("message");
                    if (message != null) {
                        String content = (String) message.get("content");
                        if (content != null) {
                            content = content.trim();
                            // Remove markdown codeblock fences if returned by accident
                            if (content.startsWith("```")) {
                                content = content.replaceAll("```json|```", "").trim();
                            }
                            
                            List<Map<String, String>> rawCandidates = objectMapper.readValue(
                                    content,
                                    objectMapper.getTypeFactory().constructCollectionType(List.class, Map.class)
                            );

                            List<RefinedCandidate> result = new ArrayList<>();
                            for (Map<String, String> raw : rawCandidates) {
                                RefinedCandidate candidate = new RefinedCandidate();
                                candidate.refinedAddress = raw.get("refinedAddress");
                                candidate.confidence = raw.get("confidence");
                                if (candidate.refinedAddress != null && !candidate.refinedAddress.isEmpty()) {
                                    result.add(candidate);
                                }
                            }
                            suggestionCache.put(cleanAddress, result);
                            return result;
                        }
                    }
                }
            }
        } catch (Exception e) {
            System.err.println("OpenAI API call failed: " + e.getMessage());
            e.printStackTrace();
        }

        return new ArrayList<>();
    }
}
