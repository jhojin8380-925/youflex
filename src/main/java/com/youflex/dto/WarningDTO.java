	package com.youflex.dto;
	
	import java.time.LocalDateTime;
	
	import lombok.AllArgsConstructor;
	import lombok.Builder;
	import lombok.Data;
	import lombok.NoArgsConstructor;
	
	@Data
	@Builder
	@NoArgsConstructor
	@AllArgsConstructor
	public class WarningDTO {
	    private int warningId;
	    private int memberId;
	    private String warningReason;
	    private String warningStatus;
	    private LocalDateTime warningCreatedAt;
	
	    // join 조회용 (DB 컬럼 아님)
	    private String memberName;
	}
