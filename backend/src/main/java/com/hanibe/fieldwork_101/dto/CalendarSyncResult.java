package com.hanibe.fieldwork_101.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;

/** 동기화 한 번의 결과 집계. 화면에는 "새로 잡힌 N건, 검토 M건" 정도로 보여 준다. */
@Getter
@NoArgsConstructor
public class CalendarSyncResult {
    private int matched;    // 이번에 새로 자동 등록
    private int updated;    // 시각이 바뀌어 갱신
    private int unchanged;  // 이미 같은 시각으로 등록돼 있음
    private int review;     // 사람이 골라야 하는 건
    private int cancelled;  // 캘린더에서 사라져 취소
    private int ignored;    // 방문요청 형식이 아닌 일정

    public void matched() { matched++; }
    public void updated() { updated++; }
    public void unchanged() { unchanged++; }
    public void review() { review++; }
    public void cancelled() { cancelled++; }
    public void ignored() { ignored++; }
}
