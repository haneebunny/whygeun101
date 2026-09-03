package com.hanibe.fieldwork_101.controller;

import com.hanibe.fieldwork_101.dto.CalendarSyncRequest;
import com.hanibe.fieldwork_101.entity.User;
import com.hanibe.fieldwork_101.security.LoginUser;
import com.hanibe.fieldwork_101.service.CalendarSyncService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/** 폰 캘린더 일정 동기화. 앱 껍데기가 읽은 일정을 받아 고객 방문 시각으로 연결한다. */
@RestController
@RequestMapping("/api/calendar")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class CalendarController {

    private final CalendarSyncService calendarSyncService;

    @PostMapping("/sync")
    public ResponseEntity<?> sync(@RequestBody CalendarSyncRequest request, @LoginUser User user) {
        return ResponseEntity.ok(Map.of("success", true, "data", calendarSyncService.sync(user, request)));
    }

    @GetMapping("/review")
    public ResponseEntity<?> review(@LoginUser User user) {
        return ResponseEntity.ok(Map.of("success", true, "data", calendarSyncService.getReview(user)));
    }

    @PostMapping("/review/{visitId}/resolve")
    public ResponseEntity<?> resolve(@PathVariable Long visitId,
                                     @RequestBody Map<String, Long> body,
                                     @LoginUser User user) {
        calendarSyncService.resolve(user, visitId, body.get("customer_id"));
        return ResponseEntity.ok(Map.of("success", true));
    }

    @PostMapping("/review/{visitId}/ignore")
    public ResponseEntity<?> ignore(@PathVariable Long visitId, @LoginUser User user) {
        calendarSyncService.ignore(user, visitId);
        return ResponseEntity.ok(Map.of("success", true));
    }
}
