package com.hanibe.fieldwork_101.repository;

import com.hanibe.fieldwork_101.entity.Customer;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface CustomerRepository extends JpaRepository<Customer, Long> {
    List<Customer> findByUserId(Long userId);

    // 이름, 주소, 내 아이디가 모두 일치하는 고객이 존재하는지 확인
    boolean existsByNameAndAddressAndUserId(String name, String address, Long userId);
}
