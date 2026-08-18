package com.hanibe.fieldwork_101.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/debug")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class DebugController {

    @Value("${openai.api-key:}")
    private String apiKey;

    @Value("${openai.model:gpt-4o-mini}")
    private String modelName;

    private final RestTemplate restTemplate = new RestTemplate();

    @GetMapping("/openai")
    public ResponseEntity<?> debugOpenAi() {
        Map<String, Object> debugInfo = new HashMap<>();
        debugInfo.put("configured_model", modelName);
        
        boolean hasApiKey = apiKey != null && !apiKey.trim().isEmpty();
        debugInfo.put("has_api_key", hasApiKey);
        
        if (hasApiKey) {
            debugInfo.put("api_key_length", apiKey.length());
            debugInfo.put("api_key_prefix", apiKey.substring(0, Math.min(apiKey.length(), 10)));
        } else {
            debugInfo.put("api_key_length", 0);
            debugInfo.put("api_key_prefix", "NONE");
        }

        // Test API call to OpenAI
        if (!hasApiKey) {
            debugInfo.put("test_result", "FAILED: API key is missing");
            return ResponseEntity.ok(debugInfo);
        }

        String url = "https://api.openai.com/v1/chat/completions";
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("Authorization", "Bearer " + apiKey);

        Map<String, Object> requestBody = Map.of(
                "model", modelName,
                "messages", List.of(
                        Map.of("role", "user", "content", "hello")
                )
        );

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

        try {
            ResponseEntity<Map> response = restTemplate.postForEntity(url, entity, Map.class);
            debugInfo.put("test_result", "SUCCESS");
            debugInfo.put("openai_response", response.getBody());
        } catch (Exception e) {
            debugInfo.put("test_result", "FAILED");
            debugInfo.put("error_message", e.getMessage());
        }

        return ResponseEntity.ok(debugInfo);
    }
}
