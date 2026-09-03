package com.hanibe.fieldwork_101.service;

import com.hanibe.fieldwork_101.dto.CalendarEventDto;
import com.hanibe.fieldwork_101.dto.CalendarReviewDto;
import com.hanibe.fieldwork_101.dto.CalendarSyncRequest;
import com.hanibe.fieldwork_101.dto.CalendarSyncResult;
import com.hanibe.fieldwork_101.entity.CalendarVisit;
import com.hanibe.fieldwork_101.entity.Customer;
import com.hanibe.fieldwork_101.entity.User;
import com.hanibe.fieldwork_101.repository.CalendarVisitRepository;
import com.hanibe.fieldwork_101.repository.CustomerRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * 폰 캘린더의 "○○○ 고객님 방문요청(요청번호)" 일정을 고객 방문 시각으로 연결한다.
 *
 * 규칙
 * - 이름이 명단의 한 집에만 있으면 그 집(같은 이름·같은 주소의 모든 행)에 방문 시각을 넣는다.
 * - 같은 이름이 여러 집이거나 명단에 없으면 자동 등록하지 않고 검토로 남긴다. 틀린 집에 가는 것보다 한 번 더 확인하는 쪽이 낫다.
 * - 요청번호가 키다. 같은 번호가 다른 시각으로 오면 갱신, 읽은 기간 안에 있던 번호가 안 오면 취소.
 * - 취소할 때는 캘린더가 넣은 시각 그대로일 때만 지운다. 사람이 손으로 바꾼 시각은 건드리지 않는다.
 */
@Service
@RequiredArgsConstructor
public class CalendarSyncService {

    private static final Pattern TITLE = Pattern.compile("^\\s*(.+?)\\s*고객님\\s*방문요청\\s*\\((\\d+)\\)");

    private final CustomerRepository customerRepository;
    private final CalendarVisitRepository visitRepository;

    public record ParsedTitle(String name, String requestNo) {}

    public static Optional<ParsedTitle> parseTitle(String title) {
        if (title == null) return Optional.empty();
        Matcher m = TITLE.matcher(title);
        if (!m.find()) return Optional.empty();
        return Optional.of(new ParsedTitle(m.group(1).trim(), m.group(2)));
    }

    @Transactional
    public CalendarSyncResult sync(User user, CalendarSyncRequest request) {
        CalendarSyncResult result = new CalendarSyncResult();
        List<Customer> customers = customerRepository.findByUserId(user.getId());
        Map<String, CalendarVisit> existing = new HashMap<>();
        for (CalendarVisit v : visitRepository.findByUserId(user.getId())) {
            existing.put(v.getRequestNo(), v);
        }
        Set<String> seen = new HashSet<>();
        List<Customer> changed = new ArrayList<>();
        LocalDateTime now = LocalDateTime.now();

        for (CalendarEventDto event : request.getEvents() == null ? List.<CalendarEventDto>of() : request.getEvents()) {
            Optional<ParsedTitle> parsed = parseTitle(event.getTitle());
            if (parsed.isEmpty() || event.getStart() == null) {
                result.ignored();
                continue;
            }
            String name = parsed.get().name();
            String requestNo = parsed.get().requestNo();
            seen.add(requestNo);

            CalendarVisit visit = existing.get(requestNo);
            boolean wasMatched = visit != null && CalendarVisit.STATUS_MATCHED.equals(visit.getStatus());
            String previousStart = visit == null ? null : visit.getStartAt();
            if (visit == null) {
                visit = CalendarVisit.builder().user(user).requestNo(requestNo).createdAt(now).build();
                existing.put(requestNo, visit);
            }
            visit.setCustomerName(name);
            visit.setRawTitle(event.getTitle());
            visit.setStartAt(event.getStart());
            visit.setLastSeenAt(now);

            Map<String, List<Customer>> households = householdsByName(customers, name);
            if (households.size() == 1) {
                Map.Entry<String, List<Customer>> only = households.entrySet().iterator().next();
                for (Customer c : only.getValue()) {
                    if (!event.getStart().equals(c.getVisitTime())) {
                        c.setVisitTime(event.getStart());
                        changed.add(c);
                    }
                }
                visit.setStatus(CalendarVisit.STATUS_MATCHED);
                visit.setReviewReason(null);
                visit.setCustomerAddress(only.getKey());
                if (!wasMatched) result.matched();
                else if (!event.getStart().equals(previousStart)) result.updated();
                else result.unchanged();
            } else {
                visit.setStatus(CalendarVisit.STATUS_REVIEW);
                visit.setReviewReason(households.isEmpty() ? CalendarVisit.REASON_NO_MATCH : CalendarVisit.REASON_MULTIPLE);
                visit.setCustomerAddress(null);
                result.review();
            }
            visitRepository.save(visit);
        }

        // 읽은 기간 안에 있었는데 이번에 안 온 일정은 취소로 본다.
        for (CalendarVisit v : existing.values()) {
            if (seen.contains(v.getRequestNo())) continue;
            if (!inWindow(v.getStartAt(), request.getRangeStart(), request.getRangeEnd())) continue;
            boolean active = CalendarVisit.STATUS_MATCHED.equals(v.getStatus()) || CalendarVisit.STATUS_REVIEW.equals(v.getStatus());
            if (!active) continue;
            if (CalendarVisit.STATUS_MATCHED.equals(v.getStatus())) {
                for (Customer c : householdAt(customers, v.getCustomerName(), v.getCustomerAddress())) {
                    if (v.getStartAt() != null && v.getStartAt().equals(c.getVisitTime())) {
                        c.setVisitTime(null);
                        changed.add(c);
                    }
                }
            }
            v.setStatus(CalendarVisit.STATUS_CANCELLED);
            visitRepository.save(v);
            result.cancelled();
        }

        if (!changed.isEmpty()) customerRepository.saveAll(changed);
        return result;
    }

    @Transactional(readOnly = true)
    public List<CalendarReviewDto> getReview(User user) {
        List<Customer> customers = customerRepository.findByUserId(user.getId());
        return visitRepository.findByUserId(user.getId()).stream()
                .filter(v -> CalendarVisit.STATUS_REVIEW.equals(v.getStatus()))
                .sorted(Comparator.comparing(CalendarVisit::getStartAt, Comparator.nullsLast(Comparator.naturalOrder())))
                .map(v -> new CalendarReviewDto(
                        v.getId(), v.getCustomerName(), v.getRequestNo(), v.getStartAt(), v.getReviewReason(),
                        householdsByName(customers, v.getCustomerName()).values().stream()
                                .map(list -> new CalendarReviewDto.Candidate(list.get(0).getId(), list.get(0).getAddress()))
                                .collect(Collectors.toList())))
                .collect(Collectors.toList());
    }

    /** 검토 목록에서 사람이 고객을 고르면, 그 고객의 집 전체에 방문 시각을 넣는다. */
    @Transactional
    public void resolve(User user, Long visitId, Long customerId) {
        CalendarVisit visit = ownedVisit(user, visitId);
        Customer picked = customerRepository.findById(customerId)
                .filter(c -> c.getUser().getId().equals(user.getId()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "고객을 찾을 수 없습니다."));
        List<Customer> customers = customerRepository.findByUserId(user.getId());
        List<Customer> household = householdAt(customers, picked.getName(), picked.getAddress());
        if (household.isEmpty()) household = List.of(picked);
        for (Customer c : household) c.setVisitTime(visit.getStartAt());
        customerRepository.saveAll(household);
        visit.setStatus(CalendarVisit.STATUS_MATCHED);
        visit.setReviewReason(null);
        visit.setCustomerName(picked.getName());
        visit.setCustomerAddress(picked.getAddress());
        visitRepository.save(visit);
    }

    @Transactional
    public void ignore(User user, Long visitId) {
        CalendarVisit visit = ownedVisit(user, visitId);
        visit.setStatus(CalendarVisit.STATUS_IGNORED);
        visitRepository.save(visit);
    }

    private CalendarVisit ownedVisit(User user, Long visitId) {
        return visitRepository.findById(visitId)
                .filter(v -> v.getUser() != null && v.getUser().getId().equals(user.getId()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "일정을 찾을 수 없습니다."));
    }

    /** 같은 이름의 고객을 주소별로 묶는다. 한 집에 제품이 여러 대면 행이 여러 개라, 집 단위가 방문 단위다. */
    private static Map<String, List<Customer>> householdsByName(List<Customer> customers, String name) {
        String key = normalizeName(name);
        Map<String, List<Customer>> byAddress = new LinkedHashMap<>();
        for (Customer c : customers) {
            if (!key.equals(normalizeName(c.getName()))) continue;
            String addr = c.getAddress() == null ? "" : c.getAddress().trim();
            byAddress.computeIfAbsent(addr, k -> new ArrayList<>()).add(c);
        }
        return byAddress;
    }

    private static List<Customer> householdAt(List<Customer> customers, String name, String address) {
        if (address == null) return List.of();
        return householdsByName(customers, name).getOrDefault(address.trim(), List.of());
    }

    private static String normalizeName(String name) {
        return name == null ? "" : name.replace(" ", "").trim();
    }

    /** 시각 문자열이 "YYYY-MM-DD HH:mm" 고정 형식이라 문자열 비교로 순서가 맞는다. */
    private static boolean inWindow(String startAt, String rangeStart, String rangeEnd) {
        if (startAt == null || rangeStart == null || rangeEnd == null) return false;
        return startAt.compareTo(rangeStart) >= 0 && startAt.compareTo(rangeEnd) <= 0;
    }
}
