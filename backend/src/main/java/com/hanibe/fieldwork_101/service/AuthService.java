package com.hanibe.fieldwork_101.service;

import com.hanibe.fieldwork_101.dto.AuthResponse;
import com.hanibe.fieldwork_101.dto.KakaoLoginRequest;
import com.hanibe.fieldwork_101.entity.User;
import com.hanibe.fieldwork_101.repository.UserRepository;
import com.hanibe.fieldwork_101.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final JwtTokenProvider jwtTokenProvider;
    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${kakao.client-id}")
    private String kakaoClientId;

    public AuthResponse kakaoLogin(KakaoLoginRequest request) {
        // 1. 카카오 액세스 토큰 요청
        String kakaoToken = getKakaoAccessToken(request.getCode(), request.getRedirectUri());

        // 2. 카카오 유저 정보 요청
        Map<String, Object> userInfo = getKakaoUserInfo(kakaoToken);
        String kakaoId = String.valueOf(userInfo.get("id"));

        Map<String, Object> properties = (Map<String, Object>) userInfo.get("properties");
        String nickname = properties != null && properties.get("nickname") != null
                ? String.valueOf(properties.get("nickname"))
                : "영업사원";

        // 3. 유저 가입 및 닉네임 업데이트 처리
        User user = userRepository.findByKakaoId(kakaoId).orElseGet(() -> {
            User newUser = User.builder().kakaoId(kakaoId).nickname(nickname).build();
            return userRepository.save(newUser);
        });

        // Only overwrite if current nickname in DB is null, empty, or default "영업사원"
        boolean isDefaultOrEmpty = user.getNickname() == null || user.getNickname().isEmpty() || user.getNickname().equals("영업사원");
        if (isDefaultOrEmpty && !nickname.equals("영업사원") && !nickname.equals(user.getNickname())) {
            user = User.builder()
                    .id(user.getId())
                    .kakaoId(user.getKakaoId())
                    .nickname(nickname)
                    .build();
            userRepository.save(user);
        }

        // 4. 서비스 전용 JWT 토큰 발급
        String jwt = jwtTokenProvider.createToken(String.valueOf(user.getId()));

        return AuthResponse.builder()
                .accessToken(jwt)
                .nickname(user.getNickname())
                .build();
    }

    private String getKakaoAccessToken(String code, String redirectUri) {
        String tokenUrl = "https://kauth.kakao.com/oauth/token";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

        MultiValueMap<String, String> params = new LinkedMultiValueMap<>();
        params.add("grant_type", "authorization_code");
        params.add("client_id", kakaoClientId);
        params.add("redirect_uri", redirectUri);
        params.add("code", code);

        HttpEntity<MultiValueMap<String, String>> request = new HttpEntity<>(params, headers);

        ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                tokenUrl, HttpMethod.POST, request, new ParameterizedTypeReference<>() {}
        );

        return String.valueOf(response.getBody().get("access_token"));
    }

    private Map<String, Object> getKakaoUserInfo(String accessToken) {
        String userInfoUrl = "https://kapi.kakao.com/v2/user/me";

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(accessToken);

        HttpEntity<Void> request = new HttpEntity<>(headers);

        ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                userInfoUrl, HttpMethod.GET, request, new ParameterizedTypeReference<>() {}
        );

        return response.getBody();
    }
}