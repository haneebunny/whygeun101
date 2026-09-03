package com.hanibe.fieldwork_101.repository;

import com.hanibe.fieldwork_101.entity.CalendarVisit;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CalendarVisitRepository extends JpaRepository<CalendarVisit, Long> {
    List<CalendarVisit> findByUserId(Long userId);
}
