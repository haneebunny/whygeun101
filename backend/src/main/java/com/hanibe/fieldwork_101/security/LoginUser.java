package com.hanibe.fieldwork_101.security;

import java.lang.annotation.*;

@Target(ElementType.PARAMETER)
@Retention(RetentionPolicy.RUNTIME)
public @interface LoginUser {
    //  컨트롤러에서 @LoginUser User user 라고 쓰면 알아서 유저를 찾아주는 마법의 이름표
}