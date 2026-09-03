package com.hanibe.fieldwork_101.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * 폰 캘린더에서 가져온 방문요청 일정 한 건.
 * 요청번호(캘린더 제목의 괄호 안 숫자)가 고유 키라서, 같은 번호가 다시 오면 시각 변경으로, 안 오면 취소로 본다.
 */
@Entity
@Table(name = "calendar_visits")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CalendarVisit {

    public static final String STATUS_MATCHED = "MATCHED";     // 고객과 연결돼 방문 시각이 들어감
    public static final String STATUS_REVIEW = "REVIEW";       // 사람이 골라야 함
    public static final String STATUS_CANCELLED = "CANCELLED"; // 캘린더에서 사라짐
    public static final String STATUS_IGNORED = "IGNORED";     // 사람이 무시함

    public static final String REASON_NO_MATCH = "NO_MATCH";   // 명단에 없는 이름
    public static final String REASON_MULTIPLE = "MULTIPLE";   // 같은 이름이 여러 집

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    private String requestNo;
    private String customerName;
    /** "YYYY-MM-DD HH:mm". Customer.visitTime과 같은 형식. */
    private String startAt;
    private String rawTitle;

    private String status;
    private String reviewReason;
    /** 연결된 집의 주소. 취소 때 어느 고객의 방문 시각을 지울지 찾는 데 쓴다. */
    private String customerAddress;

    private LocalDateTime lastSeenAt;
    private LocalDateTime createdAt;
}
