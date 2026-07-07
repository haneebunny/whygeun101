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
            Map<String, Integer> result = customerService.uploadExcel(file, user);
            return ResponseEntity.ok(Map.of(
                "success", true,
                "addedCount", result.get("addedCount"),
                "deletedCount", result.get("deletedCount")
            ));
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

    @PutMapping("/{customerId}/favorite")
    public ResponseEntity<?> updateFavorite(@PathVariable Long customerId,
                                            @RequestBody Map<String, Boolean> body,
                                            @LoginUser User user) {
        boolean favorite = body.getOrDefault("favorite", false);
        customerService.updateCustomerFavorite(customerId, favorite, user);
        return ResponseEntity.ok(Map.of("success", true));
    }

    @PutMapping("/{customerId}/absent")
    public ResponseEntity<?> updateAbsent(@PathVariable Long customerId,
                                          @RequestBody Map<String, Boolean> body,
                                          @LoginUser User user) {
        boolean absent = body.getOrDefault("absent", false);
        customerService.updateCustomerAbsent(customerId, absent, user);
        return ResponseEntity.ok(Map.of("success", true));
    }

    @PutMapping("/{customerId}/visit-time")
    public ResponseEntity<?> updateVisitTime(@PathVariable Long customerId,
                                             @RequestBody Map<String, String> body,
                                             @LoginUser User user) {
        String visitTime = body.get("visit_time");
        customerService.updateCustomerVisitTime(customerId, visitTime, user);
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

    @PostMapping
    public ResponseEntity<?> addCustomer(@RequestBody com.hanibe.fieldwork_101.dto.CustomerAddRequest request,
                                         @LoginUser User user) {
        com.hanibe.fieldwork_101.entity.Customer customer = customerService.addCustomer(request, user);
        return ResponseEntity.ok(Map.of("success", true, "customer_id", customer.getId()));
    }

    @PutMapping("/{customerId}/memo")
    public ResponseEntity<?> updateMemo(@PathVariable Long customerId,
                                        @RequestBody Map<String, String> body,
                                        @LoginUser User user) {
        String memo = body.get("memo");
        customerService.updateCustomerMemo(customerId, memo, user);
        return ResponseEntity.ok(Map.of("success", true));
    }

    @GetMapping("/weather")
    public ResponseEntity<?> getWeather(@RequestParam(value = "lat", required = false) Double lat,
                                         @RequestParam(value = "lng", required = false) Double lng) {
        Map<String, Object> data = customerService.getWeatherData(lat, lng);
        return ResponseEntity.ok(data);
    }

    @GetMapping("/corrections")
    public ResponseEntity<?> getAddressCorrections(@LoginUser User user) {
        return ResponseEntity.ok(customerService.getAddressCorrections(user));
    }

    @GetMapping("/{customerId}/correction-candidates")
    public ResponseEntity<?> getCustomerCorrectionCandidates(@PathVariable("customerId") Long customerId, @LoginUser User user) {
        return ResponseEntity.ok(customerService.getCustomerCorrectionCandidates(customerId, user));
    }

    @PostMapping("/apply-corrections-bulk")
    public ResponseEntity<?> applyCorrectionsBulk(@LoginUser User user) {
        return ResponseEntity.ok(customerService.applyCorrectionsBulk(user));
    }
}