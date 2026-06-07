package com.hanibe.fieldwork_101.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class KakaoLoginRequest {
    /* 프론트엔드에서 전달받는 카카오 인가 코드 */
    private String code;
    private String redirectUri;
}
