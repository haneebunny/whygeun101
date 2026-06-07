package com.hanibe.fieldwork_101.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@AllArgsConstructor
public class AuthResponse {
    /* 클라이언트에게 발급하는 JWT 엑세스 토큰 */
    private String accessToken;

    /* 클라이언트 화면에 표시할 유저 닉네임 */
    private String nickname;
}