package com.hanibe.fieldwork_101.controller;

import com.hanibe.fieldwork_101.entity.User;
import com.hanibe.fieldwork_101.repository.UserRepository;
import com.hanibe.fieldwork_101.security.LoginUser;
import com.hanibe.fieldwork_101.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class UserController {

    private final UserRepository userRepository;
    private final UserService userService;

    @PutMapping("/nickname")
    public ResponseEntity<?> updateNickname(@RequestBody Map<String, String> request, @LoginUser User user) {
        String nickname = request.get("nickname");
        if (nickname == null || nickname.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "닉네임은 공백일 수 없습니다."));
        }
        
        user.setNickname(nickname.trim());
        userRepository.save(user);
        
        return ResponseEntity.ok(Map.of("success", true, "nickname", user.getNickname()));
    }

    // 계정 삭제(회원 탈퇴): 본인 계정과 등록한 고객 데이터를 모두 삭제
    @DeleteMapping("/me")
    public ResponseEntity<?> deleteAccount(@LoginUser User user) {
        userService.deleteAccount(user);
        return ResponseEntity.ok(Map.of("success", true));
    }
}
