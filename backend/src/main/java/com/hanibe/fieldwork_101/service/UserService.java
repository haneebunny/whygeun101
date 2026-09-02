package com.hanibe.fieldwork_101.service;

import com.hanibe.fieldwork_101.entity.User;
import com.hanibe.fieldwork_101.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final AuthService authService;

    // 계정 삭제(회원 탈퇴): 유저와 함께 등록된 고객·일정·메모가 cascade로 모두 삭제된다.
    // 카카오 연결 해제는 관리자 키가 설정된 경우에만 시도하며, 실패해도 삭제는 완료된다.
    @Transactional
    public void deleteAccount(User user) {
        String kakaoId = user.getKakaoId();
        userRepository.delete(user);
        userRepository.flush();
        authService.unlinkKakaoAccount(kakaoId);
    }
}
