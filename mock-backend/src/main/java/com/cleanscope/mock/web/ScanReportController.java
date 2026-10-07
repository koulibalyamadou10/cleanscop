package com.cleanscope.mock.web;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

@RestController
@RequestMapping("/api")
@Validated
public class ScanReportController {

    private final List<StoredReport> reports = new ArrayList<>();

    @PostMapping("/scan-reports")
    @ResponseStatus(HttpStatus.CREATED)
    public ScanReportResponse create(@Valid @RequestBody ScanReportRequest request) {
        StoredReport stored = new StoredReport(
                UUID.randomUUID().toString(),
                request.filesFound(),
                request.bytesFound(),
                request.durationMs(),
                request.osName(),
                Instant.now().toString());
        synchronized (reports) {
            reports.add(stored);
        }
        return new ScanReportResponse(stored.id(), "accepted", stored.receivedAt());
    }

    public record ScanReportRequest(
            @NotNull @Min(0) Long filesFound,
            @NotNull @Min(0) Long bytesFound,
            @NotNull @Min(0) Long durationMs,
            @NotBlank String osName) {}

    public record ScanReportResponse(String id, String status, String receivedAt) {}

    private record StoredReport(
            String id,
            Long filesFound,
            Long bytesFound,
            Long durationMs,
            String osName,
            String receivedAt) {}
}
