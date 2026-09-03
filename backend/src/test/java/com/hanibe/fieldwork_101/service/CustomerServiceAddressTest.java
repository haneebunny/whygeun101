package com.hanibe.fieldwork_101.service;

import com.hanibe.fieldwork_101.dto.AddressCorrectionDto;
import com.hanibe.fieldwork_101.entity.Customer;
import com.hanibe.fieldwork_101.entity.User;
import com.hanibe.fieldwork_101.repository.CustomerRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;

@SpringBootTest
class CustomerServiceAddressTest {

    @Autowired
    private CustomerService customerService;

    @MockitoBean
    private CustomerRepository customerRepository;

    @MockitoBean
    private OpenAiService openAiService;

    @Test
    @DisplayName("행정구역 상충 주소(동작구 명일로): LLM이 강동구로 교정 시 유효 후보로 채택됨")
    void testAddressCorrectionWithAdminConflictFixedByLlm() {
        User user = User.builder().id(1L).kakaoId("test_kakao").nickname("테스트").build();
        Customer customer = Customer.builder()
                .id(100L)
                .user(user)
                .name("전찬솔")
                .address("서울 동작구 명일로 376 106동 1602호 (삼익그린11차아파트)")
                .build();

        given(customerRepository.findById(100L)).willReturn(Optional.of(customer));

        OpenAiService.RefinedCandidate cand = new OpenAiService.RefinedCandidate();
        cand.refinedAddress = "서울 강동구 명일로 376, 삼익그린11차아파트 106동 1602호";
        cand.confidence = "HIGH";

        given(openAiService.suggestCorrections(anyString())).willReturn(List.of(cand));

        AddressCorrectionDto dto = customerService.getCustomerCorrectionCandidates(100L, user);

        assertThat(dto.getCandidates()).isNotEmpty();
        assertThat(dto.getCandidates().get(0).getRefinedAddress()).contains("강동구 명일로 376");
    }

    @Test
    @DisplayName("LLM 응답 실패 시 단지명(삼익그린11차아파트) 키워드 검색으로 유효 주소 폴백 복구")
    void testAddressCorrectionKeywordFallback() {
        User user = User.builder().id(1L).kakaoId("test_kakao").nickname("테스트").build();
        Customer customer = Customer.builder()
                .id(101L)
                .user(user)
                .name("전찬솔")
                .address("서울 동작구 명일로 376 106동 1602호 (삼익그린11차아파트)")
                .build();

        given(customerRepository.findById(101L)).willReturn(Optional.of(customer));
        // LLM이 빈 결과를 리턴하거나 401 등으로 실패한 상황 모사
        given(openAiService.suggestCorrections(anyString())).willReturn(Collections.emptyList());

        AddressCorrectionDto dto = customerService.getCustomerCorrectionCandidates(101L, user);

        assertThat(dto.getCandidates()).isNotEmpty();
        assertThat(dto.getCandidates().get(0).getRefinedAddress()).contains("명일로 376");
    }

    @Test
    @DisplayName("단지명 헬리오시티 및 공백 동호수(111 1303호) 키워드 폴백 검증")
    void testHelioCityAddressCorrection() {
        User user = User.builder().id(1L).kakaoId("test_kakao").nickname("테스트").build();
        Customer customer = Customer.builder()
                .id(102L)
                .user(user)
                .name("피바다")
                .address("가락동 913번지 345 송파 헬리오시티 111 1303호")
                .build();

        given(customerRepository.findById(102L)).willReturn(Optional.of(customer));
        // LLM이 실패하더라도
        given(openAiService.suggestCorrections(anyString())).willReturn(Collections.emptyList());

        AddressCorrectionDto dto = customerService.getCustomerCorrectionCandidates(102L, user);

        assertThat(dto.getCandidates()).isNotEmpty();
        assertThat(dto.getCandidates().get(0).getRefinedAddress()).contains("헬리오시티");
        assertThat(dto.getCandidates().get(0).getRefinedAddress()).contains("111동 1303호");
    }
}
