package com.hanibe.fieldwork_101.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** 앱 껍데기가 폰 캘린더에서 읽어 보내는 일정 한 건. start는 "YYYY-MM-DD HH:mm" 현지 시각. */
@Getter
@Setter
@NoArgsConstructor
public class CalendarEventDto {
    private String title;
    private String start;
    private String eventId;
}
