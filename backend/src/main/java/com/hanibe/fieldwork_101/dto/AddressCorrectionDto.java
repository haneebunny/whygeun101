package com.hanibe.fieldwork_101.dto;

import lombok.*;

import java.util.List;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AddressCorrectionDto {
    private Long customerId;
    private String name;
    private String originalAddress;
    private List<Candidate> candidates;

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Candidate {
        private String refinedAddress;
        private String confidence; // HIGH, MEDIUM, LOW
    }
}
