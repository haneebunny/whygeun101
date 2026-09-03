package com.hanibe.fieldwork_101.controller;

import com.hanibe.fieldwork_101.entity.Customer;
import com.hanibe.fieldwork_101.entity.User;
import com.hanibe.fieldwork_101.repository.CalendarVisitRepository;
import com.hanibe.fieldwork_101.repository.CustomerRepository;
import com.hanibe.fieldwork_101.repository.UserRepository;
import com.hanibe.fieldwork_101.security.JwtTokenProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 웹이 보내는 것과 같은 JSON(snake_case)으로 실제 HTTP 계층을 통과시키는 테스트.
 * 토큰 검사, JSON 이름 변환, DB 반영까지 한 번에 확인한다.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class CalendarControllerIntegrationTest {

    @Autowired MockMvc mockMvc;
    @Autowired UserRepository userRepository;
    @Autowired CustomerRepository customerRepository;
    @Autowired CalendarVisitRepository visitRepository;
    @Autowired JwtTokenProvider jwtTokenProvider;

    private User user;
    private String bearer;
    private Customer choA;
    private Customer choB;
    private Customer choiHouse1;
    private Customer choiHouse2;

    @BeforeEach
    void setUp() {
        user = userRepository.save(User.builder().kakaoId("it-" + System.nanoTime()).nickname("매니저").build());
        bearer = "Bearer " + jwtTokenProvider.createToken(String.valueOf(user.getId()));
        String choAddr = "서울 강동구 아리수로 1 101동 101호";
        choA = customerRepository.save(Customer.builder().user(user).name("조은별").address(choAddr).build());
        choB = customerRepository.save(Customer.builder().user(user).name("조은별").address(choAddr).build());
        choiHouse1 = customerRepository.save(Customer.builder().user(user).name("최민수").address("서울 강동구 A로 1").build());
        choiHouse2 = customerRepository.save(Customer.builder().user(user).name("최민수").address("서울 강동구 B로 2").build());
    }

    @Test
    @DisplayName("토큰 없이 부르면 401")
    void requiresToken() throws Exception {
        mockMvc.perform(post("/api/calendar/sync").contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("동기화: 한 집은 자동 등록, 동명이인은 검토, 비대상 일정은 무시. 검토는 고객을 고르면 등록된다")
    void syncThenResolve() throws Exception {
        String body = """
                {
                  "range_start": "2026-09-01 00:00",
                  "range_end": "2026-09-14 23:59",
                  "events": [
                    {"title": "조은별 고객님 방문요청(111)", "start": "2026-09-01 13:00", "event_id": "e1"},
                    {"title": "최민수 고객님 방문요청(222)", "start": "2026-09-02 10:00", "event_id": "e2"},
                    {"title": "사무실 미팅", "start": "2026-09-01 10:00", "event_id": "e3"}
                  ]
                }
                """;
        mockMvc.perform(post("/api/calendar/sync").header("Authorization", bearer)
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.matched").value(1))
                .andExpect(jsonPath("$.data.review").value(1))
                .andExpect(jsonPath("$.data.ignored").value(1))
                .andExpect(jsonPath("$.data.cancelled").value(0));

        assertThat(customerRepository.findById(choA.getId()).orElseThrow().getVisitTime()).isEqualTo("2026-09-01 13:00");
        assertThat(customerRepository.findById(choB.getId()).orElseThrow().getVisitTime()).isEqualTo("2026-09-01 13:00");
        assertThat(customerRepository.findById(choiHouse1.getId()).orElseThrow().getVisitTime()).isNull();

        // 검토 목록: 최민수 한 건, 후보 두 집
        String reviewJson = mockMvc.perform(get("/api/calendar/review").header("Authorization", bearer))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(1))
                .andExpect(jsonPath("$.data[0].customer_name").value("최민수"))
                .andExpect(jsonPath("$.data[0].reason").value("MULTIPLE"))
                .andExpect(jsonPath("$.data[0].candidates.length()").value(2))
                .andReturn().getResponse().getContentAsString();
        long visitId = Long.parseLong(reviewJson.replaceAll(".*\"visit_id\":(\\d+).*", "$1"));

        mockMvc.perform(post("/api/calendar/review/" + visitId + "/resolve").header("Authorization", bearer)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"customer_id\": " + choiHouse2.getId() + "}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        assertThat(customerRepository.findById(choiHouse2.getId()).orElseThrow().getVisitTime()).isEqualTo("2026-09-02 10:00");
        assertThat(customerRepository.findById(choiHouse1.getId()).orElseThrow().getVisitTime()).isNull();
        mockMvc.perform(get("/api/calendar/review").header("Authorization", bearer))
                .andExpect(jsonPath("$.data.length()").value(0));

        // 다음 동기화에서 조은별 일정이 사라지면 취소되고 방문 시각이 비워진다
        String second = """
                {"range_start": "2026-09-01 00:00", "range_end": "2026-09-14 23:59",
                 "events": [{"title": "최민수 고객님 방문요청(222)", "start": "2026-09-02 10:00"}]}
                """;
        mockMvc.perform(post("/api/calendar/sync").header("Authorization", bearer)
                        .contentType(MediaType.APPLICATION_JSON).content(second))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.cancelled").value(1))
                .andExpect(jsonPath("$.data.unchanged").value(1));
        assertThat(customerRepository.findById(choA.getId()).orElseThrow().getVisitTime()).isNull();
        assertThat(visitRepository.findByUserId(user.getId())).hasSize(2);
    }

    @Test
    @DisplayName("다른 사용자의 검토 일정은 건드릴 수 없다 (404)")
    void cannotResolveOthersVisit() throws Exception {
        User other = userRepository.save(User.builder().kakaoId("other-" + System.nanoTime()).nickname("남").build());
        String otherBearer = "Bearer " + jwtTokenProvider.createToken(String.valueOf(other.getId()));
        String body = """
                {"range_start": "2026-09-01 00:00", "range_end": "2026-09-14 23:59",
                 "events": [{"title": "최민수 고객님 방문요청(222)", "start": "2026-09-02 10:00"}]}
                """;
        mockMvc.perform(post("/api/calendar/sync").header("Authorization", bearer)
                .contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isOk());
        long visitId = visitRepository.findByUserId(user.getId()).get(0).getId();

        mockMvc.perform(post("/api/calendar/review/" + visitId + "/ignore").header("Authorization", otherBearer))
                .andExpect(status().isNotFound());
    }
}
