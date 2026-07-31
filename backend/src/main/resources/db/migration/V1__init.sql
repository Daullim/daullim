-- 핵심 6 + lookup 7 = 13테이블.

-- ============ lookup 7종 ============
CREATE TABLE replace_reasons (
    replace_reason_cd varchar(20) PRIMARY KEY,
    label       varchar(40) NOT NULL,
    rx_code_cd  varchar(10) CHECK (rx_code_cd IS NULL OR rx_code_cd IN ('RX-BAT','RX-IOT')),
    sort_order  smallint    NOT NULL DEFAULT 0
);
CREATE TABLE battery_types (
    battery_type_cd varchar(20) PRIMARY KEY,
    label       varchar(40) NOT NULL,
    rx_code_cd  varchar(10) CHECK (rx_code_cd IS NULL OR rx_code_cd IN ('RX-BAT','RX-IOT')),
    sort_order  smallint    NOT NULL DEFAULT 0
);
CREATE TABLE detector_flags (
    detector_flag_cd varchar(20) PRIMARY KEY,
    label      varchar(40) NOT NULL,
    is_severe  boolean     NOT NULL,
    sort_order smallint    NOT NULL DEFAULT 0
);
CREATE TABLE condition_codes (
    condition_code_cd varchar(20) PRIMARY KEY,
    label         varchar(30) NOT NULL,
    severity_rank smallint    NOT NULL UNIQUE
);
CREATE TABLE unit_statuses (
    unit_status_cd varchar(20) PRIMARY KEY,
    label       varchar(20) NOT NULL,
    is_terminal boolean     NOT NULL,
    sort_order  smallint    NOT NULL DEFAULT 0
);
CREATE TABLE consent_statuses (
    consent_cd     varchar(20) PRIMARY KEY,
    label          varchar(20) NOT NULL,
    is_inspectable boolean     NOT NULL,
    unit_status_cd varchar(20) NOT NULL REFERENCES unit_statuses,
    sort_order     smallint    NOT NULL DEFAULT 0
);

INSERT INTO replace_reasons VALUES
  ('expired','내용연수 지남','RX-IOT',1), ('battery-dead','방전','RX-BAT',2),
  ('appearance','외관이상','RX-IOT',3),   ('detached','탈거','RX-IOT',4),
  ('unmarked','제조년월 미표기','RX-IOT',5), ('etc','기타',NULL,6);
INSERT INTO battery_types VALUES
  ('replaceable','교체형','RX-BAT',1), ('sealed','일체형(10년 밀폐형)','RX-IOT',2), ('unknown','모름',NULL,3);
INSERT INTO detector_flags VALUES
  ('stain','도색·기름때 오염',false,1), ('cover-damage','커버 파손·틈새',true,2),
  ('false-alarm','비화재보(오작동) 이력',false,3), ('condensation','결로·이물질 흔적',false,4);
INSERT INTO condition_codes VALUES
  ('OK_GOOD','양호',0), ('REPLACE_ADVISED','교체권고',1), ('EXPIRED','내용연수경과',2), ('DEFECTIVE','불량',3);
INSERT INTO unit_statuses VALUES ('pending','대기',false,1), ('refused','거부',false,2), ('done','완료',true,3);
INSERT INTO consent_statuses VALUES
  ('accepted','승낙',true,'done',1), ('refused','거부',false,'refused',2),
  ('vacant','공가',false,'refused',3), ('unreachable','연락두절',false,'refused',4);

-- ============ users ============
CREATE TABLE users (
    user_id       bigserial    PRIMARY KEY,
    login_id      varchar(50)  NOT NULL UNIQUE,
    password_hash varchar(255),
    name          varchar(50)  NOT NULL,
    phone         varchar(20)  NOT NULL,
    birth_on      date         NOT NULL,
    rank_nm       varchar(30),
    title_nm      varchar(30),
    org_nm        varchar(100),
    role_cd       varchar(20)  NOT NULL DEFAULT 'officer',
    is_active     boolean      NOT NULL DEFAULT true,
    withdrawn_at  timestamptz,
    created_at    timestamptz  NOT NULL DEFAULT now(),
    updated_at    timestamptz  NOT NULL DEFAULT now(),
    CONSTRAINT ck_users_role     CHECK (role_cd IN ('officer','control','admin')),
    CONSTRAINT ck_users_phone    CHECK (phone ~ '^\d{3}-\d{3,4}-\d{4}$'),
    CONSTRAINT ck_users_withdraw CHECK (withdrawn_at IS NULL OR is_active = false)
);
CREATE INDEX ix_users_active ON users (role_cd) WHERE is_active;

-- ============ buildings (대장 프리필 + 최신 점수 병합 — pipeline 월 1회 UPSERT / BE 읽기전용) ============
CREATE TABLE buildings (
    building_id    bigserial     PRIMARY KEY,
    bld_key        varchar(64)   NOT NULL UNIQUE,
    sido_cd        varchar(20)   NOT NULL,
    sigungu_cd     varchar(20)   NOT NULL,
    admin_dong_cd  varchar(20)   NOT NULL,
    address        varchar(200)  NOT NULL,
    address_norm   varchar(200)  GENERATED ALWAYS AS (regexp_replace(address,'\s','','g')) STORED,
    lat            numeric(9,6)  NOT NULL,
    lng            numeric(9,6)  NOT NULL,
    house_type_cd  varchar(20)   NOT NULL,
    floor_count    smallint      NOT NULL,
    unit_count     smallint      NOT NULL,
    use_apr_day    char(8),
    install_day    char(8),
    install_year   smallint,
    detector_model varchar(50),
    grid_id        varchar(20),
    region_type_cd varchar(10)   NOT NULL,
    lambda_i       numeric(12,6),
    rr_i           numeric(12,6),
    score          numeric(5,2)  NOT NULL,
    risk_level_cd  varchar(10)   NOT NULL,
    order_key      int           NOT NULL,
    is_explore     boolean       NOT NULL DEFAULT false,
    is_estimated   boolean       NOT NULL DEFAULT false,
    basis          varchar(100),
    rx_code_cd     varchar(10),
    score_version  varchar(20)   NOT NULL,
    computed_at    timestamptz   NOT NULL,
    created_at     timestamptz   NOT NULL DEFAULT now(),
    updated_at     timestamptz   NOT NULL DEFAULT now(),
    CONSTRAINT ck_bld_house  CHECK (house_type_cd IN ('detached','multi-user','multi-family','row-house','multi-unit')),
    CONSTRAINT ck_bld_lat    CHECK (lat BETWEEN 33 AND 39),
    CONSTRAINT ck_bld_lng    CHECK (lng BETWEEN 124 AND 132),
    CONSTRAINT ck_bld_floor  CHECK (floor_count > 0),
    CONSTRAINT ck_bld_unit   CHECK (unit_count > 0),
    CONSTRAINT ck_bld_apr    CHECK (use_apr_day IS NULL OR use_apr_day ~ '^\d{8}$'),
    CONSTRAINT ck_bld_inst   CHECK (install_day IS NULL OR install_day ~ '^\d{8}$'),
    CONSTRAINT ck_bld_year   CHECK (install_year IS NULL OR install_year BETWEEN 1990 AND 2100),
    CONSTRAINT ck_bld_region CHECK (region_type_cd IN ('URBAN','RURAL','BUFFER','NO_POP')),
    CONSTRAINT ck_bld_level  CHECK (risk_level_cd IN ('danger','warn','ok')),
    CONSTRAINT ck_bld_score  CHECK (score BETWEEN 0 AND 100),
    CONSTRAINT ck_bld_rx     CHECK (rx_code_cd IS NULL OR rx_code_cd IN ('RX-BAT','RX-IOT'))
);
CREATE INDEX ix_buildings_region    ON buildings (sigungu_cd, admin_dong_cd);
CREATE INDEX ix_buildings_addr_norm ON buildings (address_norm varchar_pattern_ops);
CREATE INDEX ix_buildings_grid      ON buildings (grid_id, order_key);
CREATE INDEX ix_buildings_score     ON buildings (score DESC);
CREATE INDEX ix_buildings_explore   ON buildings (building_id) WHERE is_explore;

-- ============ units (세대 — 점검의 실제 단위) ============
CREATE TABLE units (
    unit_id            bigserial   PRIMARY KEY,
    building_id        bigint      NOT NULL REFERENCES buildings ON DELETE RESTRICT,
    unit_seq           smallint    NOT NULL,
    ho_nm              varchar(20),
    flr_no             smallint,
    ho_nm_source_cd    varchar(20) NOT NULL,
    status_cd          varchar(20) NOT NULL DEFAULT 'pending' REFERENCES unit_statuses,
    last_inspected_day char(8),
    rx_baseline_day    char(8),
    created_at         timestamptz NOT NULL DEFAULT now(),
    updated_at         timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_units_bld_seq UNIQUE (building_id, unit_seq),
    CONSTRAINT ck_units_seq     CHECK (unit_seq > 0),
    CONSTRAINT ck_units_source  CHECK (ho_nm_source_cd IN ('expos','field','implicit')),
    CONSTRAINT ck_units_lastday CHECK (last_inspected_day IS NULL OR last_inspected_day ~ '^\d{8}$'),
    CONSTRAINT ck_units_baseday CHECK (rx_baseline_day IS NULL OR rx_baseline_day ~ '^\d{8}$')
);
CREATE UNIQUE INDEX ux_units_bld_ho ON units (building_id, ho_nm) WHERE ho_nm IS NOT NULL;
CREATE INDEX ix_units_bld_status ON units (building_id, status_cd);
CREATE INDEX ix_units_baseline   ON units (rx_baseline_day) WHERE rx_baseline_day IS NOT NULL;

-- ============ visits (append-only, soft delete) ============
CREATE TABLE visits (
    visit_id                  bigserial    PRIMARY KEY,
    unit_id                   bigint       NOT NULL REFERENCES units ON DELETE RESTRICT,
    officer_id                bigint       NOT NULL REFERENCES users ON DELETE RESTRICT,
    route_order               smallint,                 -- 실제 방문한 순서
    visited_at                timestamptz  NOT NULL DEFAULT now(),
    visited_day               char(8)      NOT NULL,    -- KST, BE 기록
    client_visit_id           uuid         UNIQUE,      -- 오프라인 멱등 키 (ADR-012 후속)
    dispatched_score          numeric(5,2),             -- 배차 스냅샷
    dispatched_order_key      int,
    score_version             varchar(20),
    consent_cd                varchar(20)  NOT NULL REFERENCES consent_statuses,
    is_inspected              boolean      NOT NULL,
    respondent_type_cd        varchar(20),
    refusal_reason_cd         varchar(20),
    refusal_note              text,
    room_count                smallint,
    mfg_ym                    char(7),
    -- 라벨 마모·도색으로 제조년월을 읽을 수 없음. 연식을 보증할 수 없어 전량 교체 대상이 된다.
    mfg_unmarked              boolean      NOT NULL DEFAULT false,
    replace_count             smallint,
    is_expired                boolean,
    effective_replace_count   smallint,
    extinguisher_installed_cd varchar(20),
    rx_done_cd                varchar(20),
    revisit_plan_cd           varchar(20)  NOT NULL,
    -- 경과 세대를 큐에서 빼는 판단의 책임 소재. ck_v_norev가 그 경우에만 강제한다.
    no_revisit_note           text,
    note                      text,
    condition_code_cd         varchar(20)  REFERENCES condition_codes,
    rule_version              varchar(20)  NOT NULL DEFAULT 'v1',
    gps_lat                   numeric(9,6),
    gps_lng                   numeric(9,6),
    deleted_at                timestamptz,
    deleted_by_user_id        bigint       REFERENCES users,
    created_at                timestamptz  NOT NULL DEFAULT now(),
    updated_at                timestamptz  NOT NULL DEFAULT now(),
    CONSTRAINT ck_v_day  CHECK (visited_day ~ '^\d{8}$'),
    CONSTRAINT ck_v_mfg  CHECK (mfg_ym IS NULL OR mfg_ym ~ '^\d{4}-(0[1-9]|1[0-2])$'),
    CONSTRAINT ck_v_resp CHECK (respondent_type_cd IS NULL OR respondent_type_cd IN ('owner','tenant','family','etc')),
    CONSTRAINT ck_v_refu CHECK (refusal_reason_cd IS NULL OR refusal_reason_cd IN ('no-need','distrust','no-time','etc')),
    CONSTRAINT ck_v_ext  CHECK (extinguisher_installed_cd IS NULL OR extinguisher_installed_cd IN ('installed','missing')),
    CONSTRAINT ck_v_rxd  CHECK (rx_done_cd IS NULL OR rx_done_cd IN ('done','advised-only')),
    CONSTRAINT ck_v_rev  CHECK (revisit_plan_cd IN ('not-needed','revisit')),
    -- ① 미발생(N/A) vs NULL
    CONSTRAINT ck_v_na CHECK (is_inspected OR (
        room_count IS NULL AND mfg_ym IS NULL AND NOT mfg_unmarked
        AND replace_count IS NULL AND is_expired IS NULL
        AND effective_replace_count IS NULL
        AND extinguisher_installed_cd IS NULL AND condition_code_cd IS NULL)),
    -- ② 승낙 시 필수값
    CONSTRAINT ck_v_done CHECK (NOT is_inspected OR (
        room_count IS NOT NULL AND (mfg_ym IS NOT NULL OR mfg_unmarked)
        AND effective_replace_count IS NOT NULL
        AND extinguisher_installed_cd IS NOT NULL AND respondent_type_cd IS NOT NULL)),
    -- ③ 실측·미표기 공존 금지
    CONSTRAINT ck_v_mfg_excl CHECK (mfg_ym IS NULL OR NOT mfg_unmarked),
    -- ④ 수량
    CONSTRAINT ck_v_rc  CHECK (room_count IS NULL OR room_count > 0),
    CONSTRAINT ck_v_rpc CHECK (replace_count IS NULL OR replace_count BETWEEN 0 AND room_count),
    CONSTRAINT ck_v_erc CHECK (effective_replace_count IS NULL OR effective_replace_count BETWEEN 0 AND room_count),
    CONSTRAINT ck_v_exp CHECK (is_expired IS NOT TRUE OR effective_replace_count = room_count),
    -- ⑤ 사후관리 분기
    -- 현장에서 교체를 끝냈으면 다시 갈 이유가 없다.
    CONSTRAINT ck_v_rxrev CHECK (rx_done_cd IS DISTINCT FROM 'done' OR revisit_plan_cd = 'not-needed'),
    -- 경과인데 교체도 재방문도 없다면 사유를 남겨야 큐에서 뺄 수 있다.
    CONSTRAINT ck_v_norev CHECK (is_expired IS NOT TRUE
        OR revisit_plan_cd <> 'not-needed'
        OR rx_done_cd IS NOT DISTINCT FROM 'done'
        OR no_revisit_note IS NOT NULL),
    -- ⑥ 게이트 분기
    CONSTRAINT ck_v_gate1 CHECK (consent_cd = 'refused' OR refusal_reason_cd IS NULL),
    CONSTRAINT ck_v_gate2 CHECK (consent_cd <> 'refused' OR refusal_reason_cd IS NOT NULL)
);
CREATE INDEX ix_visits_unit_recent   ON visits (unit_id, visited_at DESC)       WHERE deleted_at IS NULL;
CREATE INDEX ix_visits_officer_day   ON visits (officer_id, visited_day)        WHERE deleted_at IS NULL;
CREATE INDEX ix_visits_day           ON visits (visited_day)                    WHERE deleted_at IS NULL;
CREATE INDEX ix_visits_consent_day   ON visits (consent_cd, visited_day)        WHERE deleted_at IS NULL;
CREATE INDEX ix_visits_condition_day ON visits (condition_code_cd, visited_day) WHERE deleted_at IS NULL;

-- ============ replacement_items / flags ============
CREATE TABLE replacement_items (
    replacement_item_id bigserial   PRIMARY KEY,
    visit_id            bigint      NOT NULL REFERENCES visits ON DELETE CASCADE,
    item_seq            smallint    NOT NULL,
    replace_reason_cd   varchar(20) NOT NULL REFERENCES replace_reasons,
    battery_type_cd     varchar(20) REFERENCES battery_types,
    rx_code_cd          varchar(10),
    condition_code_cd   varchar(20) REFERENCES condition_codes,
    is_auto_generated   boolean     NOT NULL DEFAULT false,
    created_at          timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_ri_visit_seq UNIQUE (visit_id, item_seq),
    CONSTRAINT ck_ri_seq     CHECK (item_seq > 0),
    CONSTRAINT ck_ri_battery CHECK ((replace_reason_cd = 'battery-dead') = (battery_type_cd IS NOT NULL)),
    CONSTRAINT ck_ri_rx      CHECK (rx_code_cd IS NULL OR rx_code_cd IN ('RX-BAT','RX-IOT')),
    -- 자동 생성은 전량 교체가 확정되는 두 사유뿐이다 (경과=연식 소진, 미표기=연식 미보증)
    CONSTRAINT ck_ri_auto    CHECK (is_auto_generated = false OR replace_reason_cd IN ('expired','unmarked'))
);
CREATE INDEX ix_ri_visit  ON replacement_items (visit_id);
CREATE INDEX ix_ri_rx     ON replacement_items (rx_code_cd);
CREATE INDEX ix_ri_reason ON replacement_items (replace_reason_cd);

CREATE TABLE replacement_item_flags (
    replacement_item_id bigint      NOT NULL REFERENCES replacement_items ON DELETE CASCADE,
    detector_flag_cd    varchar(20) NOT NULL REFERENCES detector_flags,
    PRIMARY KEY (replacement_item_id, detector_flag_cd)
);
CREATE INDEX ix_rif_flag ON replacement_item_flags (detector_flag_cd);
