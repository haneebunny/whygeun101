package com.hanibe.fieldwork_101.controller;

import com.hanibe.fieldwork_101.dto.AuthResponse;
import com.hanibe.fieldwork_101.dto.KakaoLoginRequest;
import com.hanibe.fieldwork_101.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@CrossOrigin(origins = "*") // 프론트엔드 CORS 에러 방지
public class AuthController {

    private final AuthService authService;

    // 카카오 로그인 인가 코드를 받아 토큰을 반환
    @PostMapping("/kakao")
    public ResponseEntity<AuthResponse> kakaoLogin(@RequestBody KakaoLoginRequest request) {
        AuthResponse response = authService.kakaoLogin(request);
        return ResponseEntity.ok(response);
    }
}