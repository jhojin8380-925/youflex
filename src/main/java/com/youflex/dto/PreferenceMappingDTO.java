package com.youflex.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PreferenceMappingDTO {
    private int preferenceMappingId;
    private int memberId;
    private int genreCategoryId;
}
