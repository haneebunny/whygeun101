package com.hanibe.fieldwork_101.service;

import com.hanibe.fieldwork_101.dto.CalendarEventDto;
import com.hanibe.fieldwork_101.dto.CalendarSyncRequest;
import com.hanibe.fieldwork_101.dto.CalendarSyncResult;
import com.hanibe.fieldwork_101.entity.CalendarVisit;
import com.hanibe.fieldwork_101.entity.Customer;
import com.hanibe.fieldwork_101.entity.User;
import com.hanibe.fieldwork_101.repository.CalendarVisitRepository;
import com.hanibe.fieldwork_101.repository.CustomerRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

/**
 * 폰 캘린더 일정("○○○ 고객님 방문요청(요청번호)")을 방문 일정으로 연결하는 규칙 테스트.
 * 스프링 컨텍스트 없이 저장소만 가짜로 두고 규칙만 검증한다.
 */
class CalendarSyncServiceTest {

    private CustomerRepository customerRepository;
    private CalendarVisitRepository visitRepository;
    private CalendarSyncService service;
    private final User user = User.builder().id(1L).kakaoId("k").nickname("매니저").build();

    @BeforeEach
    void setUp() {
        customerRepository = mock(CustomerRepository.class);
        visitRepository = mock(CalendarVisitRepository.class);
        service = new CalendarSyncService(customerRepository, visitRepository);
        given(visitRepository.save(any(CalendarVisit.class))).willAnswer(inv -> inv.getArgument(0));
    }

    private Customer customer(long id, String name, String address, String visitTime) {
        return Customer.builder().id(id).user(user).name(name).address(address).visitTime(visitTime).build();
    }

    private CalendarSyncRequest request(CalendarEventDto... events) {
        CalendarSyncRequest req = new CalendarSyncRequest();
        req.setRangeStart("2026-09-01 00:00");
        req.setRangeEnd("2026-09-14 23:59");
        req.setEvents(List.of(events));
        return req;
    }

    private CalendarEventDto event(String title, String start) {
        CalendarEventDto e = new CalendarEventDto();
        e.setTitle(title);
        e.setStart(start);
        e.setEventId("ev-" + start);
        return e;
    }

    @Test
    @DisplayName("제목에서 고객 이름과 요청번호를 뽑는다. 형식이 다르면 비어 있다")
    void parseTitle() {
        assertThat(CalendarSyncService.parseTitle("김덕유 고객님 방문요청(265852850)"))
                .hasValueSatisfying(p -> {
                    assertThat(p.name()).isEqualTo("김덕유");
                    assertThat(p.requestNo()).isEqualTo("265852850");
                });
        assertThat(CalendarSyncService.parseTitle("송영란 고객님 방문요청 (12)")).isPresent();
        assertThat(CalendarSyncService.parseTitle("사무실 미팅")).isEmpty();
        assertThat(CalendarSyncService.parseTitle(null)).isEmpty();
    }

    @Test
    @DisplayName("이름이 한 집에만 있으면 그 집의 모든 행에 방문 시각이 들어가고 MATCHED가 된다")
    void singleHouseholdIsMatched() {
        String addr = "서울 강동구 아리수로 1 101동 101호";
        Customer a = customer(10, "조은별", addr, null);
        Customer b = customer(11, "조은별", addr, null);
        Customer c = customer(12, "김덕유", "서울 강동구 성내로 2", null);
        given(customerRepository.findByUserId(1L)).willReturn(List.of(a, b, c));
        given(visitRepository.findByUserId(1L)).willReturn(List.of());

        CalendarSyncResult result = service.sync(user, request(event("조은별 고객님 방문요청(111)", "2026-09-01 13:00")));

        assertThat(result.getMatched()).isEqualTo(1);
        assertThat(result.getReview()).isZero();
        assertThat(a.getVisitTime()).isEqualTo("2026-09-01 13:00");
        assertThat(b.getVisitTime()).isEqualTo("2026-09-01 13:00");
        assertThat(c.getVisitTime()).isNull();

        ArgumentCaptor<CalendarVisit> saved = ArgumentCaptor.forClass(CalendarVisit.class);
        verify(visitRepository).save(saved.capture());
        assertThat(saved.getValue().getStatus()).isEqualTo(CalendarVisit.STATUS_MATCHED);
        assertThat(saved.getValue().getRequestNo()).isEqualTo("111");
        assertThat(saved.getValue().getCustomerAddress()).isEqualTo(addr);
    }

    @Test
    @DisplayName("같은 이름이 두 집에 있으면 자동 등록하지 않고 검토(MULTIPLE)로 남긴다")
    void multipleHouseholdsGoToReview() {
        Customer a = customer(10, "최민수", "서울 강동구 A로 1", null);
        Customer b = customer(11, "최민수", "서울 강동구 B로 2", null);
        given(customerRepository.findByUserId(1L)).willReturn(List.of(a, b));
        given(visitRepository.findByUserId(1L)).willReturn(List.of());

        CalendarSyncResult result = service.sync(user, request(event("최민수 고객님 방문요청(222)", "2026-09-02 10:00")));

        assertThat(result.getReview()).isEqualTo(1);
        assertThat(a.getVisitTime()).isNull();
        assertThat(b.getVisitTime()).isNull();
        ArgumentCaptor<CalendarVisit> saved = ArgumentCaptor.forClass(CalendarVisit.class);
        verify(visitRepository).save(saved.capture());
        assertThat(saved.getValue().getStatus()).isEqualTo(CalendarVisit.STATUS_REVIEW);
        assertThat(saved.getValue().getReviewReason()).isEqualTo(CalendarVisit.REASON_MULTIPLE);
    }

    @Test
    @DisplayName("명단에 없는 이름은 검토(NO_MATCH)로 남긴다")
    void unknownNameGoesToReview() {
        given(customerRepository.findByUserId(1L)).willReturn(List.of(customer(10, "김덕유", "서울 어딘가 1", null)));
        given(visitRepository.findByUserId(1L)).willReturn(List.of());

        CalendarSyncResult result = service.sync(user, request(event("박신규 고객님 방문요청(333)", "2026-09-03 09:00")));

        assertThat(result.getReview()).isEqualTo(1);
        ArgumentCaptor<CalendarVisit> saved = ArgumentCaptor.forClass(CalendarVisit.class);
        verify(visitRepository).save(saved.capture());
        assertThat(saved.getValue().getReviewReason()).isEqualTo(CalendarVisit.REASON_NO_MATCH);
    }

    @Test
    @DisplayName("형식이 다른 일정(사무실 미팅)은 무시하고 저장하지 않는다")
    void nonVisitEventsAreIgnored() {
        given(customerRepository.findByUserId(1L)).willReturn(List.of());
        given(visitRepository.findByUserId(1L)).willReturn(List.of());

        CalendarSyncResult result = service.sync(user, request(event("사무실 미팅", "2026-09-01 10:00")));

        assertThat(result.getIgnored()).isEqualTo(1);
        verify(visitRepository, org.mockito.Mockito.never()).save(any());
    }

    @Test
    @DisplayName("같은 요청번호가 다른 시각으로 다시 오면 방문 시각을 바꾸고 UPDATED로 센다")
    void sameRequestNoWithNewTimeUpdates() {
        String addr = "서울 강동구 아리수로 1";
        Customer a = customer(10, "김덕유", addr, "2026-09-01 13:00");
        given(customerRepository.findByUserId(1L)).willReturn(List.of(a));
        CalendarVisit existing = CalendarVisit.builder().id(5L).user(user).requestNo("111").customerName("김덕유")
                .startAt("2026-09-01 13:00").status(CalendarVisit.STATUS_MATCHED).customerAddress(addr).build();
        given(visitRepository.findByUserId(1L)).willReturn(List.of(existing));

        CalendarSyncResult result = service.sync(user, request(event("김덕유 고객님 방문요청(111)", "2026-09-01 15:00")));

        assertThat(result.getUpdated()).isEqualTo(1);
        assertThat(result.getMatched()).isZero();
        assertThat(a.getVisitTime()).isEqualTo("2026-09-01 15:00");
        assertThat(existing.getStartAt()).isEqualTo("2026-09-01 15:00");
    }

    @Test
    @DisplayName("동기화 범위 안에 있던 일정이 캘린더에서 사라지면 CANCELLED로 바꾸고, 손대지 않은 방문 시각만 지운다")
    void missingEventInWindowIsCancelled() {
        String addr = "서울 강동구 아리수로 1";
        Customer untouched = customer(10, "김덕유", addr, "2026-09-01 13:00");
        Customer manuallyMoved = customer(11, "송영란", "서울 강동구 B로 2", "2026-09-05 11:00");
        given(customerRepository.findByUserId(1L)).willReturn(List.of(untouched, manuallyMoved));
        CalendarVisit v1 = CalendarVisit.builder().id(5L).user(user).requestNo("111").customerName("김덕유")
                .startAt("2026-09-01 13:00").status(CalendarVisit.STATUS_MATCHED).customerAddress(addr).build();
        CalendarVisit v2 = CalendarVisit.builder().id(6L).user(user).requestNo("222").customerName("송영란")
                .startAt("2026-09-02 14:00").status(CalendarVisit.STATUS_MATCHED).customerAddress("서울 강동구 B로 2").build();
        CalendarVisit outsideWindow = CalendarVisit.builder().id(7L).user(user).requestNo("333").customerName("이영미")
                .startAt("2026-10-01 09:00").status(CalendarVisit.STATUS_MATCHED).customerAddress("서울 강동구 C로 3").build();
        given(visitRepository.findByUserId(1L)).willReturn(List.of(v1, v2, outsideWindow));

        CalendarSyncResult result = service.sync(user, request());

        assertThat(result.getCancelled()).isEqualTo(2);
        assertThat(v1.getStatus()).isEqualTo(CalendarVisit.STATUS_CANCELLED);
        assertThat(v2.getStatus()).isEqualTo(CalendarVisit.STATUS_CANCELLED);
        assertThat(outsideWindow.getStatus()).isEqualTo(CalendarVisit.STATUS_MATCHED);
        assertThat(untouched.getVisitTime()).isNull();
        assertThat(manuallyMoved.getVisitTime()).isEqualTo("2026-09-05 11:00");
    }

    @Test
    @DisplayName("검토 목록에서 고객을 고르면 그 집 전체에 방문 시각이 들어가고 MATCHED가 된다")
    void resolveReviewAssignsHousehold() {
        String addr = "서울 강동구 A로 1";
        Customer a = customer(10, "최민수", addr, null);
        Customer a2 = customer(12, "최민수", addr, null);
        Customer b = customer(11, "최민수", "서울 강동구 B로 2", null);
        given(customerRepository.findByUserId(1L)).willReturn(List.of(a, a2, b));
        CalendarVisit visit = CalendarVisit.builder().id(9L).user(user).requestNo("222").customerName("최민수")
                .startAt("2026-09-02 10:00").status(CalendarVisit.STATUS_REVIEW).reviewReason(CalendarVisit.REASON_MULTIPLE).build();
        given(visitRepository.findById(9L)).willReturn(Optional.of(visit));
        given(customerRepository.findById(10L)).willReturn(Optional.of(a));

        service.resolve(user, 9L, 10L);

        assertThat(visit.getStatus()).isEqualTo(CalendarVisit.STATUS_MATCHED);
        assertThat(visit.getCustomerAddress()).isEqualTo(addr);
        assertThat(a.getVisitTime()).isEqualTo("2026-09-02 10:00");
        assertThat(a2.getVisitTime()).isEqualTo("2026-09-02 10:00");
        assertThat(b.getVisitTime()).isNull();
    }

    @Test
    @DisplayName("검토에서 고른 집은 다음 동기화에서 동명이인이어도 그대로 유지된다")
    void chosenHouseholdSurvivesNextSync() {
        Customer a = customer(10, "최민수", "서울 강동구 A로 1", null);
        Customer b = customer(11, "최민수", "서울 강동구 B로 2", "2026-09-02 10:00");
        given(customerRepository.findByUserId(1L)).willReturn(List.of(a, b));
        CalendarVisit chosen = CalendarVisit.builder().id(9L).user(user).requestNo("222").customerName("최민수")
                .startAt("2026-09-02 10:00").status(CalendarVisit.STATUS_MATCHED).customerAddress("서울 강동구 B로 2").build();
        given(visitRepository.findByUserId(1L)).willReturn(List.of(chosen));

        CalendarSyncResult result = service.sync(user, request(event("최민수 고객님 방문요청(222)", "2026-09-02 11:00")));

        assertThat(result.getUpdated()).isEqualTo(1);
        assertThat(result.getReview()).isZero();
        assertThat(chosen.getStatus()).isEqualTo(CalendarVisit.STATUS_MATCHED);
        assertThat(chosen.getCustomerAddress()).isEqualTo("서울 강동구 B로 2");
        assertThat(b.getVisitTime()).isEqualTo("2026-09-02 11:00");
        assertThat(a.getVisitTime()).isNull();
    }
}
