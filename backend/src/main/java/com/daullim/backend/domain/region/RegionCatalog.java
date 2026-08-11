package com.daullim.backend.domain.region;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

/** 지역 명칭 사전 — {@code buildings}에 명칭 컬럼이 없어 코드만으로는 셀렉터를 그릴 수 없다. */
@Component
public class RegionCatalog {

  private static final String RESOURCE = "regions.csv";

  private static final String LEVEL_SIDO = "sido";
  private static final String LEVEL_SIGUNGU = "sigungu";
  private static final String LEVEL_DONG = "dong";

  /** 코드-명칭 쌍 — 계층은 {@code parentCode}로 연결 */
  public record Region(String code, String name, String parentCode) {}

  private final List<Region> sidos;
  private final Map<String, List<Region>> sigungusBySido;
  private final Map<String, List<Region>> dongsBySigungu;

  RegionCatalog() {
    List<Region> loadedSidos = new ArrayList<>();
    Map<String, List<Region>> loadedSigungus = new LinkedHashMap<>();
    Map<String, List<Region>> loadedDongs = new LinkedHashMap<>();

    for (String[] row : readRows()) {
      Region region = new Region(row[1], row[2], row[3]);
      switch (row[0]) {
        case LEVEL_SIDO -> loadedSidos.add(region);
        case LEVEL_SIGUNGU ->
            loadedSigungus.computeIfAbsent(region.parentCode(), k -> new ArrayList<>()).add(region);
        case LEVEL_DONG ->
            loadedDongs.computeIfAbsent(region.parentCode(), k -> new ArrayList<>()).add(region);
        default -> throw new IllegalStateException("알 수 없는 지역 level: " + row[0]);
      }
    }

    this.sidos = List.copyOf(loadedSidos);
    this.sigungusBySido = deepCopy(loadedSigungus);
    this.dongsBySigungu = deepCopy(loadedDongs);
  }

  public List<Region> sidos() {
    return sidos;
  }

  public List<Region> sigungus(String sidoCd) {
    return sigungusBySido.getOrDefault(sidoCd, List.of());
  }

  public List<Region> dongs(String sigunguCd) {
    return dongsBySigungu.getOrDefault(sigunguCd, List.of());
  }

  /** 헤더 1행 스킵 후 4열 고정 파싱 — 쉼표·따옴표 없는 사전이라 CSV 파서 미사용 */
  private static List<String[]> readRows() {
    List<String[]> rows = new ArrayList<>();
    try (BufferedReader reader =
        new BufferedReader(
            new InputStreamReader(
                new ClassPathResource(RESOURCE).getInputStream(), StandardCharsets.UTF_8))) {
      reader.readLine();
      for (String line = reader.readLine(); line != null; line = reader.readLine()) {
        if (line.isBlank()) {
          continue;
        }
        String[] cols = line.split(",", -1);
        if (cols.length != 4) {
          throw new IllegalStateException(RESOURCE + " 열 수가 4가 아니다: " + line);
        }
        rows.add(cols);
      }
    } catch (IOException e) {
      throw new UncheckedIOException(RESOURCE + "를 읽지 못했다", e);
    }
    return rows;
  }

  private static Map<String, List<Region>> deepCopy(Map<String, List<Region>> source) {
    Map<String, List<Region>> copy = new LinkedHashMap<>();
    source.forEach((key, value) -> copy.put(key, List.copyOf(value)));
    return Map.copyOf(copy);
  }
}
