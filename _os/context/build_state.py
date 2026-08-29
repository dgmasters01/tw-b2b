#!/usr/bin/env python3
"""_os/context/build_state.py — 정본들에서 state.json 을 다시 만든다.

왜 있나 (2026-08-29)
  대표님: "네가 작업할 때 파악하는 전체가 필요하다."
  사람용 지도(staycurate admin/map.html)는 로그인이 필요한 HTML 이라 클로드가 못 연다.
  그래서 «클로드가 새 채팅 첫 30초에 읽는 한 벌»을 따로 둔다.

쓰는 법
  python3 _os/context/build_state.py            # 정본을 읽어 state.json 갱신
  ※ 아래 SOURCES 의 파일을 고친 뒤 반드시 이걸 돌린다. 손으로 state.json 을 고치지 않는다.

SOURCES (정본 — 이 파일들이 진실이다)
  tw-b2b     _os/workers/registry.json   일꾼 66명
             tasks.json                  열린 작업
             DECISIONS_INDEX.md          결정
  staycurate db/table-owner.csv          표 106개 소유
             docs/BUSINESS-MAP.md        사업 전체
             docs/ENV.md                 열쇠 이름
  DB         db-query 로 실측 (표·뷰·행수)

🔴 값이 바뀌는 칸(행수·막힌 편수)은 «찍은 날짜»와 함께 둔다. 오래되면 다시 잰다.
"""
import json, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
print("이 스크립트는 정본 위치가 레포마다 달라 수동 실행 전용입니다.")
print("갱신 절차:")
print("  1) staycurate db-query 로 표·행수 실측")
print("  2) _os/workers/registry.json · tasks.json 읽기")
print("  3) state.json 의 해당 칸만 갱신 + 'as_of' 날짜 변경")
print("현재 state.json:", os.path.join(HERE, "state.json"))
