package com.hanibe.fieldwork_101.controller;

import com.hanibe.fieldwork_101.entity.Customer;
import com.hanibe.fieldwork_101.entity.User;
import com.hanibe.fieldwork_101.repository.CustomerRepository;
import com.hanibe.fieldwork_101.repository.UserRepository;
import com.hanibe.fieldwork_101.security.JwtTokenProvider;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class UserControllerAccountDeletionTest {

    @Autowired MockMvc mockMvc;
    @Autowired UserRepository userRepository;
    @Autowired CustomerRepository customerRepository;
    @Autowired JwtTokenProvider jwtTokenProvider;

    private User createUserWithCustomers(String kakaoId, int customerCount) {
        User user = userRepository.save(User.builder().kakaoId(kakaoId).nickname("테스터").build());
        for (int i = 0; i < customerCount; i++) {
            customerRepository.save(Customer.builder()
                    .name("고객" + i).address("서울시 " + i).user(user).build());
        }
        return user;
    }

    @Test
    void deleteMe_removesUserAndAllOfTheirCustomers_butNotOtherUsers() throws Exception {
        User me = createUserWithCustomers("kakao-me-" + System.nanoTime(), 2);
        User other = createUserWithCustomers("kakao-other-" + System.nanoTime(), 1);
        String token = jwtTokenProvider.createToken(String.valueOf(me.getId()));

        mockMvc.perform(delete("/api/users/me").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        assertThat(userRepository.findById(me.getId())).isEmpty();
        assertThat(customerRepository.findByUserId(me.getId())).isEmpty();
        assertThat(userRepository.findById(other.getId())).isPresent();
        assertThat(customerRepository.findByUserId(other.getId())).hasSize(1);
    }

    @Test
    void deleteMe_withoutToken_returns401() throws Exception {
        mockMvc.perform(delete("/api/users/me"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void deleteMe_withTokenOfAlreadyDeletedUser_returns401() throws Exception {
        User me = createUserWithCustomers("kakao-gone-" + System.nanoTime(), 0);
        String token = jwtTokenProvider.createToken(String.valueOf(me.getId()));
        userRepository.delete(me);

        mockMvc.perform(delete("/api/users/me").header("Authorization", "Bearer " + token))
                .andExpect(status().isUnauthorized());
    }
}
