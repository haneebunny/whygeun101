package com.hanibe.fieldwork_101.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

/** 동기화 요청. range는 앱이 읽은 기간이라, 이 기간 안에 있던 일정이 events에 없으면 취소로 본다. */
@Getter
@Setter
@NoArgsConstructor
public class CalendarSyncRequest {
    private String rangeStart;
    private String rangeEnd;
    private List<CalendarEventDto> events;
}
