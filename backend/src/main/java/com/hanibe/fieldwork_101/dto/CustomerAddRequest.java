package com.hanibe.fieldwork_101.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CustomerAddRequest {
    private String name;
    private String address;
    private String phone;
    private String modelName;
    private String serviceType;
}
