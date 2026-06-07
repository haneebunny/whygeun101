package com.hanibe.fieldwork_101.controller;

import com.hanibe.fieldwork_101.entity.User;
import com.hanibe.fieldwork_101.security.LoginUser;
import com.hanibe.fieldwork_101.service.CustomerService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

@RestController
@RequestMapping("/api/customers")
@RequiredArgsConstructor
@CrossOrigin(origins = "*") // CORS 에러 방지
public class CustomerController {

    private final CustomerService customerService;

    // 💡 @LoginUser User user -> 이거 하나만 적으면 아까 만든 문지기가 유저를 쏙 넣어줌!
    @PostMapping("/upload")
    public ResponseEntity<?> uploadExcel(@RequestParam("file") MultipartFile file,
                                         @LoginUser User user) {
        try {
            customerService.uploadExcel(file, user);
            return ResponseEntity.ok(Map.of("message", "업로드 및 동기화 처리가 완료되었습니다."));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("detail", "서버 내부 오류: " + e.getMessage()));
        }
    }

    @GetMapping
    public ResponseEntity<?> getCustomers(@LoginUser User user) {
        return ResponseEntity.ok(customerService.getCustomers(user));
    }

    @PutMapping("/{customerId}/status")
    public ResponseEntity<?> updateStatus(@PathVariable Long customerId,
                                          @RequestBody com.hanibe.fieldwork_101.dto.StatusUpdateRequest request,
                                          @LoginUser User user) {
        customerService.updateCustomerStatus(customerId, request.getStatus(), user);
        return ResponseEntity.ok(Map.of("success", true));
    }

    @PutMapping("/{customerId}")
    public ResponseEntity<?> updateAddress(@PathVariable Long customerId,
                                           @RequestBody com.hanibe.fieldwork_101.dto.AddressUpdateRequest request,
                                           @LoginUser User user) {
        return ResponseEntity.ok(customerService.updateCustomerAddress(customerId, request.getAddress(), user));
    }

    @DeleteMapping("/{customerId}")
    public ResponseEntity<?> deleteCustomer(@PathVariable Long customerId, @LoginUser User user) {
        customerService.deleteCustomer(customerId, user);
        return ResponseEntity.ok(Map.of("message", "성공적으로 삭제되었습니다.", "deleted_id", customerId));
    }

    @DeleteMapping
    public ResponseEntity<?> clearAllCustomers(@LoginUser User user) {
        customerService.deleteAllCustomers(user);
        return ResponseEntity.ok(Map.of("message", "나의 모든 영업 동선 데이터가 초기화되었습니다."));
    }
}