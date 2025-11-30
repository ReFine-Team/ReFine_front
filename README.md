# 🛡️ Re:Fine 악성 댓글 필터링 및 대체 브라우저 확장 프로그램

> **"건강한 인터넷 문화를 위한 AI 기반 악성 댓글 탐지 및 순화 솔루션"**

## 📌 프로젝트 개요 (Overview)
본 프로젝트는 유튜브, 네이버 뉴스, 인스타그램 등 다양한 웹 플랫폼에서 발생하는 악성 댓글을 실시간으로 탐지하고, 이를 순화된 언어로 변환하여 사용자에게 보여주는 **크롬 확장 프로그램(Chrome Extension)** 서비스입니다.

## 🎯 개발 목표 (Goal)
온라인 커뮤니티, sns, 뉴스 기사 댓글 등 웹 사이트 내 악의적인 댓글을 자동으로 감지하고 필터링함으로써 건강한 인터넷 환경을 조성하고자 합니다.

---


## 🛠️ 개발 환경 (Development Environment)

| 분류 | 상세 내용 |
| :--- | :--- |
| **운영체제** | <img src="https://img.shields.io/badge/Windows-0078D6?style=flat&logo=windows&logoColor=white"> <img src="https://img.shields.io/badge/MacOS-000000?style=flat&logo=apple&logoColor=white"> |
| **언어** | <img src="https://img.shields.io/badge/JavaScript-F7DF1E?style=flat&logo=javascript&logoColor=black"> |
| **프레임워크** | <img src="https://img.shields.io/badge/React-61DAFB?style=flat&logo=React&logoColor=black"> <img src="https://img.shields.io/badge/Vite-646CFF?style=flat&logo=Vite&logoColor=white">
| **IDE** | <img src="https://img.shields.io/badge/VS_Code-007ACC?style=flat&logo=visualstudiocode&logoColor=white"> |
| **버전 관리 및 협업** | <img src="https://img.shields.io/badge/Git-F05032?style=flat&logo=git&logoColor=white"> <img src="https://img.shields.io/badge/GitHub-181717?style=flat&logo=github&logoColor=white"> <img src="https://img.shields.io/badge/Notion-000000?style=flat&logo=notion&logoColor=white"> |
---

## 💡 주요 기능 (Key Features)

### 1. 실시간 댓글 수집 (Real-time Comments Scraping)
* 사용자가 보고 있는 웹 페이지(Youtube, Instagram, Naver News 등)의 DOM을 분석하여 댓글 영역을 자동으로 탐지하고 텍스트를 추출합니다.

### 2. 감정/문맥 분석 통합 판단 (Sentiment/Context Analysis)
* e-KcBERT와 e-KcELECTRA를 활용해 댓글의 감정(긍정/부정)과 문맥(혐오/비혐오)을 동시 분석합니다.

### 3. KoBART와 KoT5 기반 순화 변환 (Purification & Conversion)
* 순화 모델을 통해 부정적이거나 공격적인 문장을 자연스럽고 중립적인 문장으로 변환합니다.

### 4. 실시간 필터링 및 시각화 제공 (Real-time Filtering & Visualization)
* 크롬 확장 프로그램을 통해 실시간으로 댓글을 분석/순화합니다.
* '왜 순화됐나요?' 버튼 클릭 시 이동하는 페이지를 통해 서비스에 대한 간략한 소개, 사용 가이드, 순화 기준에 대한 설명을 확인할 수 있습니다.

---

## 🏗️ 시스템 아키텍처 (System Architecture)
<img width="1392" height="494" alt="Image" src="https://github.com/user-attachments/assets/a9af5cde-94c9-4478-a253-0ba7f8aaa53d" />
