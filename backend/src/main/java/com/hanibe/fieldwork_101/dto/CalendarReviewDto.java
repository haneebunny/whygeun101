package com.hanibe.fieldwork_101.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.util.List;

/** 검토 목록 한 건. candidates는 같은 이름의 집 목록이고, NO_MATCH면 비어 있다. */
@Getter
@AllArgsConstructor
public class CalendarReviewDto {
    private Long visitId;
    private String customerName;
    private String requestNo;
    private String startAt;
    private String reason;
    private List<Candidate> candidates;

    @Getter
    @AllArgsConstructor
    public static class Candidate {
        private Long customerId;
        private String address;
    }
}
