package com.hanibe.fieldwork_101.controller;

import com.hanibe.fieldwork_101.entity.User;
import com.hanibe.fieldwork_101.repository.UserRepository;
import com.hanibe.fieldwork_101.security.LoginUser;
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
}
