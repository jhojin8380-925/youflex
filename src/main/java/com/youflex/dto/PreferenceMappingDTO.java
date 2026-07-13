package com.youflex.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PreferenceMappingDTO {
    private int preferenceMappingId;
    private int memberId;
    private int genreCategoryId;

    // join 조회용 (DB 컬럼 아님)
    private String genreCategoryName;
}
