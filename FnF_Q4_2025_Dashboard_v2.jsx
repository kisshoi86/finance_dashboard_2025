import React, { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, ComposedChart, Area } from 'recharts';

// ============================================
// F&F Corporation Q4 2025 Financial Dashboard
// shadcn/ui 스타일 적용
// ============================================

// 커스텀 도넛 차트 툴팁 컴포넌트
const CustomPieTooltip = ({ active, payload, formatter }) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    const color = data.payload.color;
    const name = data.name;
    const value = formatter ? formatter(data.value) : data.value;
    
    return (
      <div className="bg-white/95 backdrop-blur-sm border border-zinc-200 rounded-lg shadow-lg px-3 py-2 min-w-[160px]">
        <div className="flex items-center gap-2 mb-1">
          <span 
            className="w-2.5 h-2.5 rounded-full flex-shrink-0" 
            style={{ backgroundColor: color }}
          />
          <span className="text-xs font-medium text-zinc-700 whitespace-nowrap">{name}</span>
        </div>
        <div className="text-sm font-semibold text-zinc-900 pl-4 whitespace-nowrap">{value}</div>
      </div>
    );
  }
  return null;
};

// 커스텀 차트 툴팁 컴포넌트
const CustomChartTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/95 backdrop-blur-sm border border-zinc-200 rounded-lg shadow-lg px-3 py-2.5 min-w-[140px]">
        <p className="text-xs font-medium text-zinc-500 mb-1.5 pb-1.5 border-b border-zinc-100 whitespace-nowrap">{label}</p>
        <div className="space-y-1">
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-1.5">
                <span 
                  className="w-2 h-2 rounded-full flex-shrink-0" 
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-xs text-zinc-600 whitespace-nowrap">{entry.name || entry.dataKey}</span>
              </div>
              <span className="text-xs font-semibold text-zinc-900 whitespace-nowrap">{entry.value?.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

export default function FnFQ4Dashboard() {
  const [activeTab, setActiveTab] = useState('summary');
  const [selectedAccount, setSelectedAccount] = useState('매출액');
  const [selectedBSAccount, setSelectedBSAccount] = useState('자산총계');
  const [isNonOperatingExpanded, setIsNonOperatingExpanded] = useState(false);
  const [incomeViewMode, setIncomeViewMode] = useState('quarter'); // 'quarter' | 'annual'
  const [selectedPeriod, setSelectedPeriod] = useState('2025_Q4'); // 선택된 조회기간 ('2025_Q1' ~ '2025_Q4')
  const [incomeEditMode, setIncomeEditMode] = useState(false); // 손익계산서 증감 분석 편집 모드
  const [bsEditMode, setBsEditMode] = useState(false); // 재무상태표 증감 분석 편집 모드
  const [incomeEditData, setIncomeEditData] = useState({}); // 손익계산서 문장 편집 데이터 {account_entity: [text, text, ...]}
  const [bsEditData, setBsEditData] = useState({}); // 재무상태표 문장 편집 데이터
  
  // 법인 표시 순서 고정
  const ENTITY_ORDER = ['OC(국내)', '중국', '홍콩', 'ST미국', '기타(연결조정)'];
  const [bsCompareMode, setBsCompareMode] = useState('prevYearEnd'); // 'sameQuarter' (동분기) | 'prevYearEnd' (전기말)

  // ============================================
  // 기간 매핑 함수
  // ============================================
  const getPeriodKey = (selectedPeriod, type) => {
    // selectedPeriod: '2025_Q1', '2025_Q2', '2025_Q3', '2025_Q4'
    // type: 'quarter' (분기), 'year' (누적), 'prev_quarter' (전년 동 분기), 'prev_year' (전년 동기 누적), 'prev' (전 분기)
    const [year, quarter] = selectedPeriod.split('_');
    const yearNum = parseInt(year);
    const quarterNum = quarter.replace('Q', '');
    
    if (type === 'quarter') {
      return `${year}_${quarterNum}Q`;
    } else if (type === 'year') {
      // 누적: Q4는 '2025_Year', Q1~Q3는 '2025_1Q_Year' 형식
      if (quarterNum === '4') {
        return `${year}_Year`;
      }
      return `${year}_${quarterNum}Q_Year`;
    } else if (type === 'prev_quarter') {
      const prevYear = (yearNum - 1).toString();
      return `${prevYear}_${quarterNum}Q`;
    } else if (type === 'prev_year') {
      const prevYear = (yearNum - 1).toString();
      // 전년 동기 누적: Q4는 '2024_Year', Q1~Q3는 '2024_1Q_Year' 형식
      if (quarterNum === '4') {
        return `${prevYear}_Year`;
      }
      return `${prevYear}_${quarterNum}Q_Year`;
    } else if (type === 'prev') {
      // 전 분기: Q1이면 전년 Q4, 그 외는 같은 해 전 분기
      if (quarterNum === '1') {
        const prevYear = (yearNum - 1).toString();
        return `${prevYear}_4Q`;
      } else {
        const prevQuarter = (parseInt(quarterNum) - 1).toString();
        return `${year}_${prevQuarter}Q`;
      }
    }
    return `${year}_4Q`; // 기본값
  };

  const getPeriodLabel = (selectedPeriod) => {
    // '2025_Q4' -> 'FY2025 Q4'
    return selectedPeriod.replace('_', ' ');
  };

  // ============================================
  // 재무상태표 조회 기준(컴포넌트 전역)
  // - 동분기: 전년 동분기 비교 (예: 2024.3Q vs 2025.3Q)
  // - 전기말: 전년 기말 비교 (예: 2024.4Q vs 2025.3Q)
  // ============================================
  const bsCurrentPeriod = getPeriodKey(selectedPeriod, 'quarter'); // 선택된 분기 기말
  // bsCompareMode에 따라 비교 기간 결정
  const bsPrevPeriod = bsCompareMode === 'sameQuarter' 
    ? getPeriodKey(selectedPeriod, 'prev_quarter') // 전년 동분기 (예: 2024_3Q)
    : '2024_4Q'; // 전기말 (고정)
  
  // 비교 기간 라벨 생성 (UI 표시용)
  const getBsPeriodLabel = (period) => {
    if (!period) return '';
    const [year, q] = period.split('_');
    return `${year}.${q}`;
  };

    // ============================================
  // 손익계산서 데이터 - 분기(3개월) + 누적(연간) 통합 (CSV 기반)
  // ============================================
  const incomeStatementData = {
    // 2024년 분기 (3개월)
    '2024_1Q': {
      매출액: 507029,
      매출원가: 174545,
      매출총이익: 332484,
      판매비와관리비: 202273,
      인건비: 19658,
      광고선전비: 24097,
      수수료: 118770,
      감가상각비: 20565,
      기타판관비: 19183,
      영업이익: 130211,
      영업외손익: 21031,
      외환손익: 10008,
      선물환손익: 473,
      금융상품손익: 1941,
      이자손익: 4736,
      배당수익: 62,
      기타손익: 2913,
      지분법손익: 803,
      기부금: 94,
      법인세비용차감전순이익: 128159,
      법인세비용: 31837,
      당기순이익: 96322,
    },
    '2024_2Q': {
      매출액: 391473,
      매출원가: 120174,
      매출총이익: 271299,
      판매비와관리비: 179497,
      인건비: 22002,
      광고선전비: 16955,
      수수료: 102336,
      감가상각비: 21537,
      기타판관비: 16667,
      영업이익: 91802,
      영업외손익: 16367,
      외환손익: 5536,
      선물환손익: 471,
      금융상품손익: 748,
      이자손익: 4846,
      배당수익: 2144,
      기타손익: 1412,
      지분법손익: 800,
      기부금: 409,
      법인세비용차감전순이익: 97956,
      법인세용: 24005,
      법인세비용: 24005,
      당기순이익: 73951,
    },
    '2024_3Q': {
      매출액: 450963,
      매출원가: 166042,
      매출총이익: 284921,
      판매비와관리비: 176618,
      인건비: 19926,
      광고선전비: 19902,
      수수료: 96464,
      감가상각비: 23267,
      기타판관비: 17059,
      영업이익: 108303,
      영업외손익: 32491,
      외환손익: 5066,
      선물환손익: 1022,
      금융상품손익: 2468,
      이자손익: 4486,
      배당수익: 1088,
      기타손익: 7353,
      지분법손익: 9098,
      기부금: 1910,
      법인세비용차감전순이익: 109840,
      법인세비용: 30039,
      당기순이익: 79801,
    },
    '2024_4Q': {
      매출액: 546545,
      매출원가: 188255,
      매출총이익: 358290,
      판매비와관리비: 237871,
      인건비: 22685,
      광고선전비: 32179,
      수수료: 135912,
      감가상각비: 23440,
      기타판관비: 23655,
      영업이익: 120419,
      영업외손익: 55396,
      외환손익: 16230,
      선물환손익: 685,
      금융상품손익: 845,
      이자손익: 4538,
      배당수익: -271,
      기타손익: 9703,
      지분법손익: 17757,
      기부금: 826,
      법인세비용차감전순이익: 141346,
      법인세비용: 35461,
      당기순이익: 105885,
    },

    // 2024년 누적
    '2024_1Q_Year': {
      매출액: 507029,
      매출원가: 174545,
      매출총이익: 332484,
      판매비와관리비: 202273,
      인건비: 19658,
      광고선전비: 24097,
      수수료: 118770,
      감가상각비: 20565,
      기타판관비: 19183,
      영업이익: 130211,
      영업외손익: 21031,
      외환손익: 10008,
      선물환손익: 473,
      금융상품손익: 1941,
      이자손익: 4736,
      배당수익: 62,
      기타손익: 2913,
      지분법손익: 803,
      기부금: 94,
      법인세비용차감전순이익: 128159,
      법인세비용: 31837,
      당기순이익: 96322,
    },
    '2024_2Q_Year': {
      매출액: 898501,
      매출원가: 294720,
      매출총이익: 603781,
      판매비와관리비: 381771,
      인건비: 41660,
      광고선전비: 41052,
      수수료: 221107,
      감가상각비: 42103,
      기타판관비: 35849,
      영업이익: 222010,
      영업외손익: 37398,
      외환손익: 15547,
      선물환손익: 944,
      금융상품손익: 2689,
      이자손익: 9581,
      배당수익: 2207,
      기타손익: 4326,
      지분법손익: 1603,
      기부금: 503,
      법인세비용차감전순이익: 226115,
      법인세비용: 55842,
      당기순이익: 170273,
    },
    '2024_3Q_Year': {
      매출액: 1349465,
      매출원가: 460761,
      매출총이익: 888704,
      판매비와관리비: 558386,
      인건비: 61585,
      광고선전비: 60954,
      수수료: 317570,
      감가상각비: 65370,
      기타판관비: 52907,
      영업이익: 330318,
      영업외손익: 69888,
      외환손익: 20612,
      선물환손익: 1966,
      금융상품손익: 5157,
      이자손익: 14068,
      배당수익: 3295,
      기타손익: 11678,
      지분법손익: 10701,
      기부금: 2413,
      법인세비용차감전순이익: 335955,
      법인세비용: 85881,
      당기순이익: 250074,
    },
    '2024_Year': {
      매출액: 1896010,
      매출원가: 649017,
      매출총이익: 1246993,
      판매비와관리비: 796256,
      인건비: 84270,
      광고선전비: 93133,
      수수료: 453482,
      감가상각비: 88809,
      기타판관비: 76562,
      영업이익: 450737,
      영업외손익: 125284,
      외환손익: 36843,
      선물환손익: 2651,
      금융상품손익: 6002,
      이자손익: 18606,
      배당수익: 3024,
      기타손익: 21379,
      지분법손익: 28458,
      기부금: 3239,
      법인세비용차감전순이익: 477301,
      법인세비용: 121341,
      당기순이익: 355960,
    },

    // 2025년 분기 (3개월)
    '2025_1Q': {
      매출액: 505617,
      매출원가: 175882,
      매출총이익: 329735,
      판매비와관리비: 206117,
      인건비: 21638,
      광고선전비: 24609,
      수수료: 114788,
      감가상각비: 24508,
      기타판관비: 20574,
      영업이익: 123618,
      영업외손익: 37983,
      외환손익: 21907,
      선물환손익: 3457,
      금융상품손익: 1129,
      이자손익: 4360,
      배당수익: 337,
      기타손익: 6022,
      지분법손익: 766,
      기부금: 5,
      법인세비용차감전순이익: 110663,
      법인세비용: 28094,
      당기순이익: 82569,
    },
    '2025_2Q': {
      매출액: 378870,
      매출원가: 119965,
      매출총이익: 258905,
      판매비와관리비: 174878,
      인건비: 20875,
      광고선전비: 19539,
      수수료: 95162,
      감가상각비: 22116,
      기타판관비: 17186,
      영업이익: 84027,
      영업외손익: 25837,
      외환손익: 10246,
      선물환손익: 5637,
      금융상품손익: -46,
      이자손익: 3016,
      배당수익: 37,
      기타손익: 6118,
      지분법손익: 828,
      기부금: 0,
      법인세비용차감전순이익: 86083,
      법인세비용: 23444,
      당기순이익: 62639,
    },
    '2025_3Q': {
      매출액: 474257,
      매출원가: 165303,
      매출총이익: 308954,
      판매비와관리비: 180936,
      인건비: 20266,
      광고선전비: 25032,
      수수료: 93907,
      감가상각비: 22262,
      기타판관비: 19469,
      영업이익: 128018,
      영업외손익: 23580,
      외환손익: 9435,
      선물환손익: -5393,
      금융상품손익: 668,
      이자손익: 3480,
      배당수익: 482,
      기타손익: 5713,
      지분법손익: 9117,
      기부금: 78,
      법인세비용차감전순이익: 135278,
      법인세비용: 34583,
      당기순이익: 100695,
    },

    // 2025년 누적
    '2025_1Q_Year': {
      매출액: 505617,
      매출원가: 175882,
      매출총이익: 329735,
      판매비와관리비: 206117,
      인건비: 21638,
      광고선전비: 24609,
      수수료: 114788,
      감가상각비: 24508,
      기타판관비: 20574,
      영업이익: 123618,
      영업외손익: 37983,
      외환손익: 21907,
      선물환손익: 3457,
      금융상품손익: 1129,
      이자손익: 4360,
      배당수익: 337,
      기타손익: 6022,
      지분법손익: 766,
      기부금: 5,
      법인세비용차감전순이익: 110663,
      법인세비용: 28094,
      당기순이익: 82569,
    },
    '2025_2Q_Year': {
      매출액: 884487,
      매출원가: 295848,
      매출총이익: 588639,
      판매비와관리비: 380996,
      인건비: 42515,
      광고선전비: 44148,
      수수료: 209951,
      감가상각비: 46623,
      기타판관비: 37759,
      영업이익: 207643,
      영업외손익: 63818,
      외환손익: 32153,
      선물환손익: 9095,
      금융상품손익: 1083,
      이자손익: 7377,
      배당수익: 373,
      기타손익: 12138,
      지분법손익: 1594,
      기부금: 5,
      법인세비용차감전순이익: 196746,
      법인세비용: 51538,
      당기순이익: 145208,
    },
    '2025_3Q_Year': {
      매출액: 1358744,
      매출원가: 461149,
      매출총이익: 897595,
      판매비와관리비: 561928,
      인건비: 62780,
      광고선전비: 69180,
      수수료: 303857,
      감가상각비: 68886,
      기타판관비: 57225,
      영업이익: 335667,
      영업외손익: 87398,
      외환손익: 41588,
      선물환손익: 3700,
      금융상품손익: 1752,
      이자손익: 10856,
      배당수익: 855,
      기타손익: 17854,
      지분법손익: 10711,
      기부금: 83,
      법인세비용차감전순이익: 332024,
      법인세비용: 86121,
      당기순이익: 245903,
    },
    '2025_3Q_Year_old': {
      매출액: 1358744,
      매출원가: 461149,
      매출총이익: 897595,
      판매비와관리비: 561928,
      인건비: 62780,
      광고선전비: 69180,
      수수료: 303857,
      감가상각비: 68886,
      기타판관비: 57225,
      영업이익: 335667,
      영업외손익: 87398,
      외환손익: 41588,
      선물환손익: 3700,
      금융상품손익: 1752,
      이자손익: 10856,
      배당수익: 855,
      기타손익: 17854,
      지분법손익: 10711,
      기부금: 83,
      법인세비용차감전순이익: 332024,
      법인세비용: 86121,
      당기순이익: 245903,
    },

    // 2025년 4분기 (당분기, 3개월) - 2025_IS.csv 기반
    '2025_4Q': {
      매출액: 575252,        // 연간 1,933,996 - 3분기누적 1,358,744
      매출원가: 181038,      // 연간 642,187 - 3분기누적 461,149
      매출총이익: 394214,    // 연간 1,291,809 - 3분기누적 897,595
      판매비와관리비: 261338, // 연간 823,266 - 3분기누적 561,928
      인건비: 20948,         // 연간 83,728 - 3분기누적 62,780 (추정)
      광고선전비: 39904,     // 연간 109,084 - 3분기누적 69,180
      수수료: 130167,        // 연간 434,024 - 3분기누적 303,857
      감가상각비: 22961,     // 연간 91,847 - 3분기누적 68,886 (추정)
      기타판관비: 47358,     // 차이 계산
      영업이익: 132876,      // 연간 468,543 - 3분기누적 335,667
      영업외손익: 73503,     // 연간 133,996 - 37,359 - 영업외비용 차이
      외환손익: 12664,       // 외환차익 - 외환차손
      선물환손익: -1352,     // 파생상품 관련
      금융상품손익: 198,     // 금융상품평가손익
      이자손익: -1847,       // 이자수익 - 이자비용 (당분기 기준)
      배당수익: 100,         // 배당금수익
      기타손익: -5387,       // 기타
      지분법손익: 79432,     // 연간 90,022 - 3분기누적 10,551
      기부금: -19,           // 기부금 차이
      법인세비용차감전순이익: 210022, // 연간 542,046 - 3분기누적 332,024
      법인세비용: 53214,     // 연간 139,335 - 3분기누적 86,121
      당기순이익: 156808,    // 연간 402,711 - 3분기누적 245,903
    },

    // 2025년 연간 누적 (4분기까지 포함) - 2025_IS.csv 연간누적 기반
    '2025_Year': {
      매출액: 1933996,       // 연결 손익계산서 연간 누적
      매출원가: 642187,      // 연결 손익계산서 연간 누적
      매출총이익: 1291809,   // 연결 손익계산서 연간 누적
      판매비와관리비: 823266, // 연결 손익계산서 연간 누적
      인건비: 83728,         // 급여+퇴직급여 추정
      광고선전비: 109084,    // 광고선전비 연간
      수수료: 434024,        // 지급수수료 연간
      감가상각비: 91847,     // 감가상각비+무형자산상각비 연간
      기타판관비: 104583,    // 기타 판관비 합계
      영업이익: 468543,      // 연결 영업이익
      영업외손익: 73503,     // 영업외수익 - 영업외비용
      외환손익: 7164,        // (외환차익+외화환산이익) - (외환차손+외화환산손실)
      선물환손익: -1352,     // 파생상품평가/거래손익
      금융상품손익: -1310,   // 당기손익-공정가치측정금융자산 평가/처분손익
      이자손익: -7847,       // 이자수익 - 이자비용
      배당수익: 955,         // 배당금수익
      기타손익: -5424,       // 기타잡이익 - 잡손실 등
      지분법손익: 90022,     // 지분법이익 - 지분법손실
      기부금: 64,            // 기부금
      법인세비용차감전순이익: 542046, // 법인세비용차감전순이익
      법인세비용: 139335,    // 법인세비용
      당기순이익: 402711,    // 연결 당기순이익
    },
  };

  // ============================================
  // 손익계산서 세부 계정 데이터 (증감 분석용) - financial_detail_data.json 기반
  // ============================================
  const incomeDetailData = {
    '2024_1Q_Year': { 매출액: 507029, 제품매출: 165016, 상품매출: 5934, 수수료매출: 360, 임대매출: 68, 기타매출: 3595, 매출원가: 174545, 매출총이익: 332484, 판매비와관리비: 202273, 급여: 18472, 퇴직급여: 1186, 복리후생비: 3796, 광고선전비: 24097, 운반비: 6120, 지급수수료: 112650, 감가상각비: 18718, 무형자산상각비: 1847, 영업이익: 130211 },
    '2024_1Q': { 매출액: 507029, 제품매출: 165016, 상품매출: 5934, 수수료매출: 360, 임대매출: 68, 기타매출: 3595, 매출원가: 174545, 매출총이익: 332484, 판매비와관리비: 202273, 급여: 18472, 퇴직급여: 1186, 복리후생비: 3796, 광고선전비: 24097, 운반비: 6120, 지급수수료: 112650, 감가상각비: 18718, 무형자산상각비: 1847, 영업이익: 130211 },
    '2024_2Q_Year': { 매출액: 898502, 제품매출: 278476, 상품매출: 8382, 수수료매출: 716, 임대매출: 138, 기타매출: 7862, 매출원가: 294719, 매출총이익: 603782, 판매비와관리비: 381770, 급여: 39262, 퇴직급여: 2398, 복리후생비: 7263, 광고선전비: 41052, 운반비: 9961, 지급수수료: 211146, 감가상각비: 38092, 무형자산상각비: 4011, 영업이익: 222012 },
    '2024_2Q': { 매출액: 391473, 제품매출: 113459, 상품매출: 2448, 수수료매출: 356, 임대매출: 70, 기타매출: 4267, 매출원가: 120174, 매출총이익: 271299, 판매비와관리비: 179497, 급여: 20790, 퇴직급여: 1212, 복리후생비: 3467, 광고선전비: 16955, 운반비: 3840, 지급수수료: 98496, 감가상각비: 19373, 무형자산상각비: 2164, 영업이익: 91801 },
    '2024_3Q_Year': { 매출액: 1349465, 제품매출: 427107, 상품매출: 10931, 수수료매출: 1018, 임대매출: 208, 기타매출: 22723, 매출원가: 460761, 매출총이익: 888704, 판매비와관리비: 558387, 급여: 58004, 퇴직급여: 3581, 복리후생비: 11135, 광고선전비: 60954, 운반비: 15655, 지급수수료: 301915, 감가상각비: 57437, 무형자산상각비: 7933, 영업이익: 330317 },
    '2024_3Q': { 매출액: 450963, 제품매출: 148632, 상품매출: 2549, 수수료매출: 302, 임대매출: 70, 기타매출: 14861, 매출원가: 166042, 매출총이익: 284921, 판매비와관리비: 176616, 급여: 18742, 퇴직급여: 1184, 복리후생비: 3872, 광고선전비: 19902, 운반비: 5695, 지급수수료: 90769, 감가상각비: 19346, 무형자산상각비: 3921, 영업이익: 108305 },
    '2024_4Q_Year': { 매출액: 1896010, 제품매출: 602266, 상품매출: 15361, 수수료매출: 1475, 임대매출: 278, 기타매출: 31390, 매출원가: 649017, 매출총이익: 1246993, 판매비와관리비: 796255, 급여: 79511, 퇴직급여: 4759, 복리후생비: 15120, 광고선전비: 93133, 운반비: 22114, 지급수수료: 431368, 감가상각비: 77149, 무형자산상각비: 11660, 영업이익: 450737 },
    '2024_4Q': { 매출액: 546544, 제품매출: 175158, 상품매출: 4430, 수수료매출: 458, 임대매출: 70, 기타매출: 8667, 매출원가: 188256, 매출총이익: 358289, 판매비와관리비: 237868, 급여: 21507, 퇴직급여: 1178, 복리후생비: 3985, 광고선전비: 32179, 운반비: 6459, 지급수수료: 129453, 감가상각비: 19712, 무형자산상각비: 3728, 영업이익: 120420 },
    '2024_Year': { 매출액: 1896010, 제품매출: 602266, 상품매출: 15361, 수수료매출: 1475, 임대매출: 278, 기타매출: 31390, 매출원가: 649017, 매출총이익: 1246993, 판매비와관리비: 796255, 급여: 79511, 퇴직급여: 4759, 복리후생비: 15120, 광고선전비: 93133, 운반비: 22114, 지급수수료: 431368, 감가상각비: 77149, 무형자산상각비: 11660, 영업이익: 450737 },
    '2025_1Q_Year': { 매출액: 505616, 제품매출: 170204, 상품매출: 3836, 수수료매출: 324, 임대매출: 71, 기타매출: 1842, 매출원가: 175883, 매출총이익: 329733, 판매비와관리비: 206117, 급여: 20176, 퇴직급여: 1462, 복리후생비: 4424, 광고선전비: 24609, 운반비: 5928, 지급수수료: 108860, 감가상각비: 20870, 무형자산상각비: 3638, 영업이익: 123616 },
    '2025_1Q': { 매출액: 505616, 제품매출: 170204, 상품매출: 3836, 수수료매출: 324, 임대매출: 71, 기타매출: 1842, 매출원가: 175883, 매출총이익: 329733, 판매비와관리비: 206117, 급여: 20176, 퇴직급여: 1462, 복리후생비: 4424, 광고선전비: 24609, 운반비: 5928, 지급수수료: 108860, 감가상각비: 20870, 무형자산상각비: 3638, 영업이익: 123616 },
    '2025_2Q_Year': { 매출액: 884487, 제품매출: 284912, 상품매출: 6144, 수수료매출: 593, 임대매출: 449, 기타매출: 4560, 매출원가: 295847, 매출총이익: 588640, 판매비와관리비: 380993, 급여: 39940, 퇴직급여: 2575, 복리후생비: 8368, 광고선전비: 44148, 운반비: 10444, 지급수수료: 199507, 감가상각비: 39444, 무형자산상각비: 7179, 영업이익: 207646 },
    '2025_2Q': { 매출액: 378871, 제품매출: 114708, 상품매출: 2308, 수수료매출: 268, 임대매출: 378, 기타매출: 2717, 매출원가: 119964, 매출총이익: 258906, 판매비와관리비: 174877, 급여: 19763, 퇴직급여: 1112, 복리후생비: 3944, 광고선전비: 19539, 운반비: 4516, 지급수수료: 90646, 감가상각비: 18574, 무형자산상각비: 3542, 영업이익: 84030 },
    '2025_3Q_Year': { 매출액: 1358744, 제품매출: 441007, 상품매출: 9784, 수수료매출: 811, 임대매출: 1013, 기타매출: 9948, 매출원가: 461150, 매출총이익: 897594, 판매비와관리비: 561928, 급여: 59251, 퇴직급여: 3529, 복리후생비: 12092, 광고선전비: 69180, 운반비: 16761, 지급수수료: 287096, 감가상각비: 58133, 무형자산상각비: 10753, 영업이익: 335666 },
    '2025_3Q': { 매출액: 474257, 제품매출: 156095, 상품매출: 3640, 수수료매출: 218, 임대매출: 564, 기타매출: 5389, 매출원가: 165303, 매출총이익: 308955, 판매비와관리비: 180935, 급여: 19311, 퇴직급여: 955, 복리후생비: 3725, 광고선전비: 25032, 운반비: 6317, 지급수수료: 87590, 감가상각비: 18689, 무형자산상각비: 3573, 영업이익: 128020 },
    '2025_4Q_Year': { 매출액: 1933996, 제품매출: 610308, 상품매출: 15937, 수수료매출: 1160, 임대매출: 1731, 기타매출: 15333, 매출원가: 642187, 매출총이익: 1291809, 판매비와관리비: 823266, 급여: 80199, 퇴직급여: 4612, 복리후생비: 16516, 광고선전비: 109084, 운반비: 24855, 지급수수료: 434024, 감가상각비: 77445, 무형자산상각비: 14402, 영업이익: 468543 },
    '2025_4Q': { 매출액: 575252, 제품매출: 169301, 상품매출: 6153, 수수료매출: 349, 임대매출: 718, 기타매출: 5385, 매출원가: 181038, 매출총이익: 394214, 판매비와관리비: 261337, 급여: 20948, 퇴직급여: 1083, 복리후생비: 4423, 광고선전비: 39905, 운반비: 8094, 지급수수료: 146928, 감가상각비: 19312, 무형자산상각비: 3650, 영업이익: 132877 },
    '2025_Year': { 매출액: 1933996, 제품매출: 610308, 상품매출: 15937, 수수료매출: 1160, 임대매출: 1731, 기타매출: 15333, 매출원가: 642187, 매출총이익: 1291809, 판매비와관리비: 823266, 급여: 80199, 퇴직급여: 4612, 복리후생비: 16516, 광고선전비: 109084, 운반비: 24855, 지급수수료: 434024, 감가상각비: 77445, 무형자산상각비: 14402, 영업이익: 468543 },
  };

  // ============================================
  // 법인별 세부 계정 데이터 (증감 분석용) - financial_detail_data.json 기반
  // ============================================
  const entityDetailData = {
    '매출액': {
      '2024_1Q': { 'OC(국내)': 388852, '중국': 238976, '홍콩': 22211, '베트남': 66, '빅텐츠': 212, '엔터테인먼트': 416, 'ST미국': 9208 },
      '2024_1Q_Year': { 'OC(국내)': 388852, '중국': 238976, '홍콩': 22211, '베트남': 66, '빅텐츠': 212, '엔터테인먼트': 416, 'ST미국': 9208 },
      '2024_2Q': { 'OC(국내)': 664484, '중국': 393520, '홍콩': 39176, '베트남': 150, '빅텐츠': 900, '엔터테인먼트': 1424, 'ST미국': 18600 },
      '2024_2Q_Year': { 'OC(국내)': 664484, '중국': 393520, '홍콩': 39176, '베트남': 150, '빅텐츠': 900, '엔터테인먼트': 1424, 'ST미국': 18600 },
      '2024_3Q': { 'OC(국내)': 1081765, '중국': 643675, '홍콩': 54736, '베트남': 259, '빅텐츠': 9175, '엔터테인먼트': 2203, 'ST미국': 26856 },
      '2024_3Q_Year': { 'OC(국내)': 1081765, '중국': 643675, '홍콩': 54736, '베트남': 259, '빅텐츠': 9175, '엔터테인먼트': 2203, 'ST미국': 26856 },
      '2024_4Q': { 'OC(국내)': 1517994, '중국': 857840, '홍콩': 75035, '베트남': 413, '빅텐츠': 9175, '엔터테인먼트': 3030, 'ST미국': 37069 },
      '2024_4Q_Year': { 'OC(국내)': 1517994, '중국': 857840, '홍콩': 75035, '베트남': 413, '빅텐츠': 9175, '엔터테인먼트': 3030, 'ST미국': 37069 },
      '2024_Year': { 'OC(국내)': 1517994, '중국': 857840, '홍콩': 75035, '베트남': 413, '빅텐츠': 9175, '엔터테인먼트': 3030, 'ST미국': 37069 },
      '2025_1Q': { 'OC(국내)': 396770, '중국': 258540, '홍콩': 20663, '베트남': 134, '빅텐츠': 0, '엔터테인먼트': 761, 'ST미국': 8505 },
      '2025_1Q_Year': { 'OC(국내)': 396770, '중국': 258540, '홍콩': 20663, '베트남': 134, '빅텐츠': 0, '엔터테인먼트': 761, 'ST미국': 8505 },
      '2025_2Q': { 'OC(국내)': 704163, '중국': 429243, '홍콩': 36405, '베트남': 287, '빅텐츠': 0, '엔터테인먼트': 1894, 'ST미국': 17474 },
      '2025_2Q_Year': { 'OC(국내)': 704163, '중국': 429243, '홍콩': 36405, '베트남': 287, '빅텐츠': 0, '엔터테인먼트': 1894, 'ST미국': 17474 },
      '2025_3Q': { 'OC(국내)': 1214834, '중국': 713162, '홍콩': 53313, '베트남': 425, '빅텐츠': 0, '엔터테인먼트': 4630, 'ST미국': 33406 },
      '2025_3Q_Year': { 'OC(국내)': 1214834, '중국': 713162, '홍콩': 53313, '베트남': 425, '빅텐츠': 0, '엔터테인먼트': 4630, 'ST미국': 33406 },
      '2025_4Q': { 'OC(국내)': 1694696, '중국': 960334, '홍콩': 76275, '베트남': 656, '빅텐츠': 0, '엔터테인먼트': 7161, 'ST미국': 48561 },
      '2025_4Q_Year': { 'OC(국내)': 1694696, '중국': 960334, '홍콩': 76275, '베트남': 656, '빅텐츠': 0, '엔터테인먼트': 7161, 'ST미국': 48561 },
      '2025_Year': { 'OC(국내)': 1694696, '중국': 960334, '홍콩': 76275, '베트남': 656, '빅텐츠': 0, '엔터테인먼트': 7161, 'ST미국': 48561 },
    },
    '제품매출': {
      '2024_1Q': { 'OC(국내)': 142846, '중국': 0, '홍콩': 0, '베트남': 0, '빅텐츠': 0, '엔터테인먼트': 0, 'ST미국': 0 },
      '2024_Year': { 'OC(국내)': 533273, '중국': 0, '홍콩': 0, '베트남': 0, '빅텐츠': 0, '엔터테인먼트': 0, 'ST미국': 0 },
      '2025_1Q': { 'OC(국내)': 142911, '중국': 0, '홍콩': 0, '베트남': 0, '빅텐츠': 0, '엔터테인먼트': 0, 'ST미국': 0 },
      '2025_Year': { 'OC(국내)': 613289, '중국': 0, '홍콩': 0, '베트남': 0, '빅텐츠': 0, '엔터테인먼트': 0, 'ST미국': 0 },
    },
    '상품매출': {
      '2024_1Q': { 'OC(국내)': 4011, '중국': 173679, '홍콩': 9231, '베트남': 0, '빅텐츠': 0, '엔터테인먼트': 0, 'ST미국': 1923 },
      '2024_Year': { 'OC(국내)': 6887, '중국': 664166, '홍콩': 32067, '베트남': 0, '빅텐츠': 0, '엔터테인먼트': 0, 'ST미국': 8474 },
      '2025_1Q': { 'OC(국내)': 1593, '중국': 203778, '홍콩': 9671, '베트남': 0, '빅텐츠': 0, '엔터테인먼트': 0, 'ST미국': 2243 },
      '2025_Year': { 'OC(국내)': 3210, '중국': 731265, '홍콩': 34810, '베트남': 0, '빅텐츠': 0, '엔터테인먼트': 0, 'ST미국': 12727 },
    },
    '급여': {
      '2024_1Q': { 'OC(국내)': 8781, '중국': 6513, '홍콩': 1928, '베트남': 0, '빅텐츠': 181, '엔터테인먼트': 312, 'ST미국': 706 },
      '2024_Year': { 'OC(국내)': 39082, '중국': 26130, '홍콩': 7811, '베트남': 0, '빅텐츠': 587, '엔터테인먼트': 1419, 'ST미국': 4165 },
      '2025_1Q': { 'OC(국내)': 8629, '중국': 7851, '홍콩': 2109, '베트남': 0, '빅텐츠': 0, '엔터테인먼트': 391, 'ST미국': 1089 },
      '2025_Year': { 'OC(국내)': 36167, '중국': 28888, '홍콩': 8945, '베트남': 0, '빅텐츠': 0, '엔터테인먼트': 1684, 'ST미국': 3961 },
    },
    '퇴직급여': {
      '2024_1Q': { 'OC(국내)': 1156, '중국': 0, '홍콩': 0, '베트남': 0, '빅텐츠': 14, '엔터테인먼트': 16, 'ST미국': 0 },
      '2024_Year': { 'OC(국내)': 4610, '중국': 0, '홍콩': 0, '베트남': 0, '빅텐츠': 52, '엔터테인먼트': 97, 'ST미국': 0 },
      '2025_1Q': { 'OC(국내)': 1127, '중국': 0, '홍콩': 301, '베트남': 0, '빅텐츠': 0, '엔터테인먼트': 35, 'ST미국': 0 },
      '2025_Year': { 'OC(국내)': 4360, '중국': 0, '홍콩': 0, '베트남': 0, '빅텐츠': 0, '엔터테인먼트': 252, 'ST미국': 0 },
    },
    '광고선전비': {
      '2024_1Q': { 'OC(국내)': 10689, '중국': 12045, '홍콩': 422, '베트남': 0, '빅텐츠': 0, '엔터테인먼트': 3, 'ST미국': 937 },
      '2024_Year': { 'OC(국내)': 40355, '중국': 45269, '홍콩': 2014, '베트남': 0, '빅텐츠': 0, '엔터테인먼트': 7, 'ST미국': 5489 },
      '2025_1Q': { 'OC(국내)': 8143, '중국': 14554, '홍콩': 534, '베트남': 0, '빅텐츠': 0, '엔터테인먼트': 0, 'ST미국': 1379 },
      '2025_Year': { 'OC(국내)': 36492, '중국': 60570, '홍콩': 2817, '베트남': 0, '빅텐츠': 0, '엔터테인먼트': 0, 'ST미국': 9277 },
    },
    '지급수수료': {
      '2024_1Q': { 'OC(국내)': 103398, '중국': 6675, '홍콩': 3518, '베트남': 1, '빅텐츠': 106, '엔터테인먼트': 43, 'ST미국': 1537 },
      '2024_Year': { 'OC(국내)': 396902, '중국': 26100, '홍콩': 4302, '베트남': 19, '빅텐츠': 355, '엔터테인먼트': 155, 'ST미국': 4518 },
      '2025_1Q': { 'OC(국내)': 98102, '중국': 8799, '홍콩': 1124, '베트남': 5, '빅텐츠': 0, '엔터테인먼트': 32, 'ST미국': 1129 },
      '2025_Year': { 'OC(국내)': 379344, '중국': 34725, '홍콩': 2569, '베트남': 31, '빅텐츠': 0, '엔터테인먼트': 160, 'ST미국': 16606 },
    },
    '감가상각비': {
      '2024_1Q': { 'OC(국내)': 9393, '중국': 5228, '홍콩': 3786, '베트남': 0, '빅텐츠': 41, '엔터테인먼트': 129, 'ST미국': 142 },
      '2024_Year': { 'OC(국내)': 37807, '중국': 23909, '홍콩': 14320, '베트남': 0, '빅텐츠': 117, '엔터테인먼트': 562, 'ST미국': 434 },
      '2025_1Q': { 'OC(국내)': 9949, '중국': 7530, '홍콩': 3123, '베트남': 0, '빅텐츠': 0, '엔터테인먼트': 157, 'ST미국': 110 },
      '2025_Year': { 'OC(국내)': 40274, '중국': 24619, '홍콩': 11457, '베트남': 0, '빅텐츠': 0, '엔터테인먼트': 644, 'ST미국': 450 },
    },
    '영업이익': {
      '2024_1Q': { 'OC(국내)': 95454, '중국': 24682, '홍콩': 650, '베트남': -3, '빅텐츠': -191, '엔터테인먼트': -2980, 'ST미국': 2591 },
      '2024_Year': { 'OC(국내)': 402407, '중국': 36099, '홍콩': 3357, '베트남': 45, '빅텐츠': -4678, '엔터테인먼트': -14173, 'ST미국': 6903 },
      '2025_1Q': { 'OC(국내)': 111978, '중국': 6110, '홍콩': 3, '베트남': 12, '빅텐츠': 0, '엔터테인먼트': -1538, 'ST미국': 996 },
      '2025_Year': { 'OC(국내)': 524452, '중국': 40209, '홍콩': 1617, '베트남': 18, '빅텐츠': 0, '엔터테인먼트': -8707, 'ST미국': -1368 },
    },
  };

  // ============================================
  // 문장형 증감 분석 생성 함수
  // ============================================
  const generateIncomeAnalysisText = (accountKey, entity, currPeriod, prevPeriod) => {
    // 연결 기준 데이터 가져오기
    const currData = incomeStatementData[currPeriod] || {};
    const prevData = incomeStatementData[prevPeriod] || {};
    const currDetail = incomeDetailData[currPeriod] || {};
    const prevDetail = incomeDetailData[prevPeriod] || {};
    
    // 법인별 데이터 가져오기
    const entityCurr = entityData[accountKey]?.[currPeriod] || {};
    const entityPrev = entityData[accountKey]?.[prevPeriod] || {};
    
    const formatRate = (val) => val >= 0 ? `+${val.toFixed(1)}%` : `${val.toFixed(1)}%`;
    const calcChange = (curr, prev) => prev !== 0 ? ((curr - prev) / Math.abs(prev) * 100) : 0;
    
    let analysis = [];
    
    if (accountKey === '매출액') {
      // 매출액: 제품매출, 상품매출 구성 분석
      const prodCurr = currDetail.제품매출 || 0;
      const prodPrev = prevDetail.제품매출 || 0;
      const merchCurr = currDetail.상품매출 || 0;
      const merchPrev = prevDetail.상품매출 || 0;
      const totalCurr = currData.매출액 || 0;
      const totalPrev = prevData.매출액 || 0;
      
      const prodChange = calcChange(prodCurr, prodPrev);
      const merchChange = calcChange(merchCurr, merchPrev);
      
      const prodRatioCurr = totalCurr > 0 ? (prodCurr / totalCurr * 100).toFixed(1) : 0;
      const merchRatioCurr = totalCurr > 0 ? (merchCurr / totalCurr * 100).toFixed(1) : 0;
      const prodRatioPrev = totalPrev > 0 ? (prodPrev / totalPrev * 100).toFixed(1) : 0;
      const merchRatioPrev = totalPrev > 0 ? (merchPrev / totalPrev * 100).toFixed(1) : 0;
      
      analysis.push(`제품매출 ${formatRate(prodChange)} (비중 ${prodRatioPrev}%→${prodRatioCurr}%)`);
      analysis.push(`상품매출 ${formatRate(merchChange)} (비중 ${merchRatioPrev}%→${merchRatioCurr}%)`);
      
      // 법인별 특이사항
      const entityChange = calcChange(entityCurr[entity] || 0, entityPrev[entity] || 0);
      if (entity === 'OC(국내)') {
        analysis.push(`국내 제품매출 중심 ${entityChange >= 0 ? '성장' : '감소'}`);
      } else if (entity === '중국') {
        analysis.push(`중국 상품매출 ${entityChange >= 0 ? '확대' : '축소'}`);
      }
    }
    
    else if (accountKey === '매출원가') {
      // 매출원가: 매출원가율 분석
      const salesCurr = currData.매출액 || 1;
      const salesPrev = prevData.매출액 || 1;
      const cogsCurr = currData.매출원가 || 0;
      const cogsPrev = prevData.매출원가 || 0;
      
      const cogsRatioCurr = (cogsCurr / salesCurr * 100).toFixed(1);
      const cogsRatioPrev = (cogsPrev / salesPrev * 100).toFixed(1);
      const ratioChange = (parseFloat(cogsRatioCurr) - parseFloat(cogsRatioPrev)).toFixed(1);
      
      analysis.push(`매출원가율 ${cogsRatioPrev}%→${cogsRatioCurr}% (${ratioChange >= 0 ? '+' : ''}${ratioChange}%p)`);
      
      // 법인별 원가율 분석
      const entitySalesCurr = entityData['매출액']?.[currPeriod]?.[entity] || 1;
      const entitySalesPrev = entityData['매출액']?.[prevPeriod]?.[entity] || 1;
      const entityCogsCurr = entityCurr[entity] || 0;
      const entityCogsPrev = entityPrev[entity] || 0;
      const entityRatioCurr = (entityCogsCurr / entitySalesCurr * 100).toFixed(1);
      const entityRatioPrev = (entityCogsPrev / entitySalesPrev * 100).toFixed(1);
      
      if (entity === 'OC(국내)') {
        analysis.push(`국내 원가율 ${entityRatioPrev}%→${entityRatioCurr}%`);
      } else if (entity === '중국') {
        analysis.push(`중국 매입원가 기반 변동`);
      }
    }
    
    else if (accountKey === '매출총이익') {
      // 매출총이익: 매출과 원가 변동 종합
      const salesChange = calcChange(currData.매출액 || 0, prevData.매출액 || 0);
      const cogsChange = calcChange(currData.매출원가 || 0, prevData.매출원가 || 0);
      const grossMarginCurr = currData.매출액 > 0 ? (currData.매출총이익 / currData.매출액 * 100).toFixed(1) : 0;
      const grossMarginPrev = prevData.매출액 > 0 ? (prevData.매출총이익 / prevData.매출액 * 100).toFixed(1) : 0;
      
      analysis.push(`매출총이익률 ${grossMarginPrev}%→${grossMarginCurr}%`);
      analysis.push(`매출 ${formatRate(salesChange)}, 원가 ${formatRate(cogsChange)}`);
      
      if (salesChange > cogsChange) {
        analysis.push('매출 증가율이 원가 증가율 상회');
      } else if (salesChange < cogsChange) {
        analysis.push('원가 증가율이 매출 증가율 상회');
      }
    }
    
    else if (accountKey === '인건비') {
      // 인건비: 급여, 퇴직급여 구성 분석
      const salaryCurr = currDetail.급여 || 0;
      const salaryPrev = prevDetail.급여 || 0;
      const severanceCurr = currDetail.퇴직급여 || 0;
      const severancePrev = prevDetail.퇴직급여 || 0;
      const totalCurr = currData.인건비 || 0;
      const totalPrev = prevData.인건비 || 0;
      
      const salaryChange = calcChange(salaryCurr, salaryPrev);
      const severanceChange = calcChange(severanceCurr, severancePrev);
      const salaryRatio = totalCurr > 0 ? (salaryCurr / totalCurr * 100).toFixed(0) : 0;
      const severanceRatio = totalCurr > 0 ? (severanceCurr / totalCurr * 100).toFixed(0) : 0;
      
      analysis.push(`급여 ${formatRate(salaryChange)} (구성비 ${salaryRatio}%)`);
      analysis.push(`퇴직급여 ${formatRate(severanceChange)} (구성비 ${severanceRatio}%)`);
    }
    
    else if (accountKey === '영업이익') {
      // 영업이익: 주요 비용 항목별 기여도 분석
      const opIncomeCurr = currData.영업이익 || 0;
      const opIncomePrev = prevData.영업이익 || 0;
      const opIncomeChange = opIncomeCurr - opIncomePrev;
      
      // 주요 비용 항목별 증감
      const expenseItems = ['인건비', '광고선전비', '수수료', '감가상각비', '기타판관비'];
      const contributions = expenseItems.map(item => {
        const curr = currData[item] || 0;
        const prev = prevData[item] || 0;
        const diff = curr - prev;
        const contribution = opIncomeChange !== 0 ? ((-diff / Math.abs(opIncomeChange)) * 100).toFixed(0) : 0;
        return { item, diff, contribution, changeRate: calcChange(curr, prev) };
      }).sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));
      
      // 가장 영향이 큰 2개 항목
      const top2 = contributions.slice(0, 2);
      top2.forEach(c => {
        const direction = c.diff > 0 ? '증가' : '감소';
        analysis.push(`${c.item} ${direction} (기여도 ${c.contribution}%)`);
      });
      
      // 영업이익률 변동
      const opMarginCurr = currData.매출액 > 0 ? (opIncomeCurr / currData.매출액 * 100).toFixed(1) : 0;
      const opMarginPrev = prevData.매출액 > 0 ? (opIncomePrev / prevData.매출액 * 100).toFixed(1) : 0;
      analysis.push(`영업이익률 ${opMarginPrev}%→${opMarginCurr}%`);
    }
    
    else if (accountKey === '광고선전비' || accountKey === '수수료' || accountKey === '감가상각비' || accountKey === '기타판관비') {
      // 판관비 세부 항목: 매출 대비 비율 분석
      const itemCurr = currData[accountKey] || 0;
      const itemPrev = prevData[accountKey] || 0;
      const salesCurr = currData.매출액 || 1;
      const salesPrev = prevData.매출액 || 1;
      
      const ratioCurr = (itemCurr / salesCurr * 100).toFixed(1);
      const ratioPrev = (itemPrev / salesPrev * 100).toFixed(1);
      const ratioChange = (parseFloat(ratioCurr) - parseFloat(ratioPrev)).toFixed(1);
      
      analysis.push(`매출대비 ${ratioPrev}%→${ratioCurr}% (${ratioChange >= 0 ? '+' : ''}${ratioChange}%p)`);
    }
    
    else if (accountKey === '당기순이익') {
      // 당기순이익: 영업이익과 영업외손익 기여도
      const netIncomeCurr = currData.당기순이익 || 0;
      const netIncomePrev = prevData.당기순이익 || 0;
      const opIncomeCurr = currData.영업이익 || 0;
      const opIncomePrev = prevData.영업이익 || 0;
      const nonOpCurr = currData.영업외손익 || 0;
      const nonOpPrev = prevData.영업외손익 || 0;
      
      const opChange = opIncomeCurr - opIncomePrev;
      const nonOpChange = nonOpCurr - nonOpPrev;
      const netChange = netIncomeCurr - netIncomePrev;
      
      const opContrib = netChange !== 0 ? ((opChange / Math.abs(netChange)) * 100).toFixed(0) : 0;
      const nonOpContrib = netChange !== 0 ? ((nonOpChange / Math.abs(netChange)) * 100).toFixed(0) : 0;
      
      analysis.push(`영업이익 변동 기여도 ${opContrib}%`);
      analysis.push(`영업외손익 변동 기여도 ${nonOpContrib}%`);
    }
    
    return analysis;
  };

  // 재무상태표 문장형 분석 생성 함수
  const generateBSAnalysisText = (accountKey, entity, currPeriod, prevPeriod) => {
    const currData = balanceSheetData[currPeriod] || {};
    const prevData = balanceSheetData[prevPeriod] || {};
    
    const formatRate = (val) => val >= 0 ? `+${val.toFixed(1)}%` : `${val.toFixed(1)}%`;
    const calcChange = (curr, prev) => prev !== 0 ? ((curr - prev) / Math.abs(prev) * 100) : 0;
    
    let analysis = [];
    
    if (accountKey === '자산총계') {
      // 주요 자산 항목별 기여도
      const majorItems = ['현금성자산', '매출채권', '재고자산', '관계기업투자', '유무형자산'];
      const totalChange = (currData.자산총계 || 0) - (prevData.자산총계 || 0);
      
      const contributions = majorItems.map(item => {
        const curr = currData[item] || 0;
        const prev = prevData[item] || 0;
        const diff = curr - prev;
        const contrib = totalChange !== 0 ? ((diff / Math.abs(totalChange)) * 100).toFixed(0) : 0;
        return { item, diff, contrib, rate: calcChange(curr, prev) };
      }).sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));
      
      const top2 = contributions.slice(0, 2);
      top2.forEach(c => {
        const direction = c.diff > 0 ? '증가' : '감소';
        analysis.push(`${c.item} ${direction} (기여도 ${c.contrib}%)`);
      });
    }
    
    else if (accountKey === '현금성자산' || accountKey === '금융상품') {
      // 현금 및 금융자산: 총자산 대비 비율
      const itemCurr = currData[accountKey] || 0;
      const itemPrev = prevData[accountKey] || 0;
      const totalCurr = currData.자산총계 || 1;
      const totalPrev = prevData.자산총계 || 1;
      
      const ratioCurr = (itemCurr / totalCurr * 100).toFixed(1);
      const ratioPrev = (itemPrev / totalPrev * 100).toFixed(1);
      
      analysis.push(`자산대비 ${ratioPrev}%→${ratioCurr}%`);
    }
    
    else if (accountKey === '재고자산') {
      // 재고자산: 회전율 관련
      const invCurr = currData.재고자산 || 0;
      const invPrev = prevData.재고자산 || 0;
      const change = calcChange(invCurr, invPrev);
      
      analysis.push(`재고 ${formatRate(change)}`);
      analysis.push(invCurr > invPrev ? '재고 수준 상승' : '재고 수준 하락');
    }
    
    else if (accountKey === '매출채권') {
      // 매출채권: 회수 관련
      const arCurr = currData.매출채권 || 0;
      const arPrev = prevData.매출채권 || 0;
      const change = calcChange(arCurr, arPrev);
      
      analysis.push(`매출채권 ${formatRate(change)}`);
    }
    
    else if (accountKey === '부채총계') {
      // 부채: 주요 항목별 기여도
      const majorItems = ['차입금', '매입채무', '미지급금', '리스부채', '기타부채'];
      const totalChange = (currData.부채총계 || 0) - (prevData.부채총계 || 0);
      
      const contributions = majorItems.map(item => {
        const curr = currData[item] || 0;
        const prev = prevData[item] || 0;
        const diff = curr - prev;
        const contrib = totalChange !== 0 ? ((diff / Math.abs(totalChange)) * 100).toFixed(0) : 0;
        return { item, diff, contrib, rate: calcChange(curr, prev) };
      }).sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));
      
      const top2 = contributions.slice(0, 2);
      top2.forEach(c => {
        const direction = c.diff > 0 ? '증가' : '감소';
        analysis.push(`${c.item} ${direction} (기여도 ${c.contrib}%)`);
      });
    }
    
    else if (accountKey === '자본총계') {
      // 자본: 이익잉여금 변동 중심
      const retainedCurr = currData.이익잉여금 || 0;
      const retainedPrev = prevData.이익잉여금 || 0;
      const change = calcChange(retainedCurr, retainedPrev);
      
      analysis.push(`이익잉여금 ${formatRate(change)}`);
      
      const equityRatio = currData.자산총계 > 0 ? 
        ((currData.자본총계 / currData.자산총계) * 100).toFixed(1) : 0;
      analysis.push(`자기자본비율 ${equityRatio}%`);
    }
    
    else if (accountKey === '차입금') {
      // 차입금: 부채비율 관련
      const debtCurr = currData.차입금 || 0;
      const debtPrev = prevData.차입금 || 0;
      const change = calcChange(debtCurr, debtPrev);
      
      const debtRatio = currData.자본총계 > 0 ? 
        ((currData.부채총계 / currData.자본총계) * 100).toFixed(1) : 0;
      
      analysis.push(`차입금 ${formatRate(change)}`);
      analysis.push(`부채비율 ${debtRatio}%`);
    }
    
    return analysis;
  };

  // ============================================
  // 재무상태표 데이터 - 전년기말 vs 당기말
  // ============================================
  // 재무상태표 데이터 (성격별 분류 - 유동/비유동 통합)
  const balanceSheetData = {
    // 2024년 연결 BS (2024_BS.csv 기반, 단위: 백만원)
    '2024_1Q': {
      현금성자산: 334707,
      금융상품: 32034,
      매출채권: 82369,
      재고자산: 323836,
      관계기업투자: 633124,
      유무형자산: 327883,
      사용권자산: 213602,
      기타자산: 109815,
      자산총계: 2057370,
      차입금: 73262,
      매입채무: 75896,
      미지급금: 95705,
      리스부채: 163946,
      보증금: 16360,
      기타부채: 282478,
      부채총계: 707649,
      자본금: 3831,
      자본잉여금: 317545,
      기타자본: -21519,
      이익잉여금: 1018879,
      비지배지분: 30985,
      자본총계: 1349721,
    },
    '2024_2Q': {
      현금성자산: 220611,
      금융상품: 18747,
      매출채권: 67859,
      재고자산: 292899,
      관계기업투자: 632510,
      유무형자산: 384106,
      사용권자산: 210463,
      기타자산: 99180,
      자산총계: 1926377,
      차입금: 820,
      매입채무: 62956,
      미지급금: 34040,
      리스부채: 160758,
      보증금: 16225,
      기타부채: 239442,
      부채총계: 514242,
      자본금: 3831,
      자본잉여금: 317545,
      기타자본: -33162,
      이익잉여금: 1092725,
      비지배지분: 31196,
      자본총계: 1412135,
    },
    '2024_3Q': {
      현금성자산: 190422,
      금융상품: 17954,
      매출채권: 135245,
      재고자산: 361737,
      관계기업투자: 634781,
      유무형자산: 441828,
      사용권자산: 207368,
      기타자산: 150141,
      자산총계: 2139478,
      차입금: 86820,
      매입채무: 130612,
      미지급금: 37911,
      리스부채: 158831,
      보증금: 16125,
      기타부채: 224490,
      부채총계: 654790,
      자본금: 3831,
      자본잉여금: 317545,
      기타자본: -40262,
      이익잉여금: 1176364,
      비지배지분: 27209,
      자본총계: 1484687,
    },
    // 2025년 연결 BS (2025_BS.csv 기반, 단위: 백만원)
    '2025_1Q': {
      현금성자산: 164044,
      금융상품: 10966,
      매출채권: 91239,
      재고자산: 314052,
      관계기업투자: 651745,
      유무형자산: 713433,
      사용권자산: 198220,
      기타자산: 114250,
      자산총계: 2257950,
      차입금: 76470,
      매입채무: 81968,
      미지급금: 100026,
      리스부채: 151882,
      보증금: 18817,
      기타부채: 234811,
      부채총계: 663974,
      자본금: 3831,
      자본잉여금: 317545,
      기타자본: -43459,
      이익잉여금: 1302260,
      비지배지분: 13799,
      자본총계: 1593976,
    },
    '2025_2Q': {
      현금성자산: 126440,
      금융상품: 11012,
      매출채권: 61178,
      재고자산: 293350,
      관계기업투자: 650955,
      유무형자산: 702103,
      사용권자산: 184171,
      기타자산: 121492,
      자산총계: 2150700,
      차입금: 32157,
      매입채무: 68454,
      미지급금: 28936,
      리스부채: 142100,
      보증금: 19565,
      기타부채: 211731,
      부채총계: 502944,
      자본금: 3831,
      자본잉여금: 317545,
      기타자본: -51346,
      이익잉여금: 1364602,
      비지배지분: 13124,
      자본총계: 1647756,
    },
    '2025_3Q': {
      현금성자산: 208285,
      금융상품: 36645,
      매출채권: 159109,
      재고자산: 414026,
      관계기업투자: 653157,
      유무형자산: 703080,
      사용권자산: 186155,
      기타자산: 140206,
      자산총계: 2500662,
      차입금: 160605,
      매입채무: 158517,
      미지급금: 36728,
      리스부채: 139760,
      보증금: 18953,
      기타부채: 235599,
      부채총계: 750162,
      자본금: 3831,
      자본잉여금: 317545,
      기타자본: -50132,
      이익잉여금: 1463247,
      비지배지분: 16009,
      자본총계: 1750500,
    },
    '2024_4Q': {
      // 자산 (성격별)
      현금성자산: 119833,
      금융상품: 19479,      // 유동 6,388 + 비유동 13,091
      매출채권: 133826,
      재고자산: 324992,
      관계기업투자: 652474,
      유무형자산: 714996,   // 유형 501,307 + 투자부동산 0 + 무형 213,689
      사용권자산: 207683,
      기타자산: 112622,     // 유동기타 51,755 + 비유동기타 60,867
      자산총계: 2285905,
      // 부채 (성격별)
      차입금: 145635,       // 단기 145,635 + 장기 0
      매입채무: 102685,
      미지급금: 41982,
      리스부채: 215428,     // 유동 57,979 + 비유동 157,449
      보증금: 5692,
      기타부채: 197185,     // 유동기타 173,828 + 비유동기타 23,355
      부채총계: 708607,
      // 자본
      자본금: 3831,
      자본잉여금: 317545,
      기타자본: -42530,
      이익잉여금: 1283355,
      비지배지분: 15098,
      자본총계: 1577298,
    },
    // 2025년 4분기 연결 BS (2025_BS.csv 기반, 단위: 백만원)
    '2025_4Q': {
      // 자산 (성격별)
      현금성자산: 325384,     // 현금및현금성자산 325,383,761,882
      금융상품: 25666,        // 기타유동금융자산 16,381 + 당기손익-공정가치측정금융자산 9,285
      매출채권: 150809,       // 매출채권 153,450 - 대손충당금 2,641
      재고자산: 402853,       // 재고자산 402,853,459,223
      관계기업투자: 732624,   // 관계기업및종속기업투자 732,624,486,386
      유무형자산: 690209,     // 유형자산 421,672 + 투자부동산 79,525 + 무형자산 189,012
      사용권자산: 185158,     // 사용권자산 185,158,233,607
      기타자산: 139222,       // 기타유동자산 + 기타비유동자산 (잔여 계산)
      자산총계: 2651925,      // 자산총계 2,651,925,131,585
      // 부채 (성격별)
      차입금: 186267,         // 단기차입금 186,267 + 장기차입금 0
      매입채무: 105001,       // 매입채무 105,000,675,174
      미지급금: 47538,        // 미지급금 47,538,358,927
      리스부채: 194619,       // 유동리스부채 58,473 + 비유동리스부채 136,146
      보증금: 24064,          // 유동성장기예수보증금 13,848 + 장기성예수보증금 10,216
      기타부채: 214861,       // 기타유동부채 + 기타비유동부채 (잔여 계산)
      부채총계: 772350,       // 부채총계 772,350,304,590
      // 자본
      자본금: 3831,           // 자본금 3,830,707,500
      자본잉여금: 307395,     // 자본잉여금 307,394,807,680
      기타자본: -51465,       // 자본조정 -59,049 + 기타포괄손익누계액 7,584
      이익잉여금: 1619815,    // 이익잉여금 1,619,814,510,174
      비지배지분: 0,          // 비지배지분 0 (연결조정)
      자본총계: 1879575,      // 자본총계 1,879,574,826,995
    },
  };

  // ============================================
  // 금융상품평가 데이터
  // ============================================
  const financialInstrumentsData = {
    '2024_4Q': {
      FVPL금융자산: 0,
      FVOCI금융자산: 0,
      AC금융자산: 0,
      파생상품자산: 0,
      당기손익인식금융부채: 0,
      상각후원가금융부채: 0,
      파생상품부채: 0,
      FVPL평가손익: 0,
      FVOCI평가손익: 0,
      파생상품평가손익: 0,
    },
  };

  // ============================================
  // 유틸리티 함수
  // ============================================
  const formatNumber = (num) => {
    if (num === 0 || num === undefined || num === null) return '-';
    return new Intl.NumberFormat('ko-KR').format(num);
  };

  const calculateYoY = (current, previous) => {
    if (!previous || previous === 0) return '-';
    const change = ((current - previous) / Math.abs(previous)) * 100;
    return change.toFixed(1);
  };

  const calculateDiff = (current, previous) => {
    if (current === 0 && previous === 0) return 0;
    return current - previous;
  };

  // ============================================
  // 탭 컴포넌트
  // ============================================
  const tabs = [
    { id: 'summary', label: '전체요약', icon: '📊' },
    { id: 'income', label: '손익계산서', icon: '📈' },
    { id: 'balance', label: '재무상태표', icon: '💰' },
  ];

  // ============================================
  // 법인별 손익계산서 데이터 (컴포넌트 상위 레벨)
  // ============================================
  // 법인별 데이터 (선택된 과목에 따라) - 분기 및 누적
  // 주의: 법인별 데이터는 연결조정 전 법인별 합산 기준
  // entity_is_data.json에서 자동 생성 (5개 법인: OC(국내), 중국, 홍콩, ST미국, 기타(연결조정))
  const entityData = {
    '매출액': {
      '2024_1Q': { 'OC(국내)': 388851, '중국': 238976, '홍콩': 22210, 'ST미국': 9208, '기타': -152217 },
      '2024_1Q_Year': { 'OC(국내)': 388851, '중국': 238976, '홍콩': 22210, 'ST미국': 9208, '기타': -152217 },
      '2024_2Q': { 'OC(국내)': 275632, '중국': 154543, '홍콩': 16965, 'ST미국': 9391, '기타': -65059 },
      '2024_2Q_Year': { 'OC(국내)': 664483, '중국': 393519, '홍콩': 39175, 'ST미국': 18599, '기타': -217276 },
      '2024_3Q': { 'OC(국내)': 417280, '중국': 250154, '홍콩': 15559, 'ST미국': 8255, '기타': -240285 },
      '2024_3Q_Year': { 'OC(국내)': 1081763, '중국': 643673, '홍콩': 54734, 'ST미국': 26854, '기타': -457561 },
      '2024_4Q': { 'OC(국내)': 436229, '중국': 214165, '홍콩': 20299, 'ST미국': 10212, '기타': -134361 },
      '2024_Year': { 'OC(국내)': 1517992, '중국': 857838, '홍콩': 75033, 'ST미국': 37066, '기타': -591922 },
      '2025_1Q': { 'OC(국내)': 396770, '중국': 258540, '홍콩': 20662, 'ST미국': 8505, '기타': -178861 },
      '2025_1Q_Year': { 'OC(국내)': 396770, '중국': 258540, '홍콩': 20662, 'ST미국': 8505, '기타': -178861 },
      '2025_2Q': { 'OC(국내)': 307392, '중국': 170703, '홍콩': 15742, 'ST미국': 8968, '기타': -123935 },
      '2025_2Q_Year': { 'OC(국내)': 704162, '중국': 429243, '홍콩': 36404, 'ST미국': 17473, '기타': -302796 },
      '2025_3Q': { 'OC(국내)': 510670, '중국': 283919, '홍콩': 16908, 'ST미국': 15931, '기타': -353171 },
      '2025_3Q_Year': { 'OC(국내)': 1214832, '중국': 713162, '홍콩': 53312, 'ST미국': 33404, '기타': -655967 },
      '2025_4Q': { 'OC(국내)': 479861, '중국': 247171, '홍콩': 22961, 'ST미국': 15155, '기타': -189897 },
      '2025_Year': { 'OC(국내)': 1694693, '중국': 960333, '홍콩': 76273, 'ST미국': 48559, '기타': -845864 },
    },
    '매출원가': {
      '2024_1Q': { 'OC(국내)': 147627, '중국': 173679, '홍콩': 9231, 'ST미국': 2030, '기타': -158023 },
      '2024_1Q_Year': { 'OC(국내)': 147627, '중국': 173679, '홍콩': 9231, 'ST미국': 2030, '기타': -158023 },
      '2024_2Q': { 'OC(국내)': 89805, '중국': 103635, '홍콩': 7228, 'ST미국': 2144, '기타': -82638 },
      '2024_2Q_Year': { 'OC(국내)': 237432, '중국': 277314, '홍콩': 16459, 'ST미국': 4174, '기타': -240661 },
      '2024_3Q': { 'OC(국내)': 158791, '중국': 198826, '홍콩': 7135, 'ST미국': 2240, '기타': -200950 },
      '2024_3Q_Year': { 'OC(국내)': 396223, '중국': 476140, '홍콩': 23594, 'ST미국': 6414, '기타': -441611 },
      '2024_4Q': { 'OC(국내)': 147388, '중국': 188024, '홍콩': 8471, 'ST미국': 2592, '기타': -158220 },
      '2024_Year': { 'OC(국내)': 543611, '중국': 664164, '홍콩': 32065, 'ST미국': 9006, '기타': -599831 },
      '2025_1Q': { 'OC(국내)': 145093, '중국': 203777, '홍콩': 9671, 'ST미국': 1966, '기타': -184625 },
      '2025_1Q_Year': { 'OC(국내)': 145093, '중국': 203777, '홍콩': 9671, 'ST미국': 1966, '기타': -184625 },
      '2025_2Q': { 'OC(국내)': 102777, '중국': 135221, '홍콩': 6988, 'ST미국': 2337, '기타': -127359 },
      '2025_2Q_Year': { 'OC(국내)': 247870, '중국': 338998, '홍콩': 16659, 'ST미국': 4303, '기타': -311984 },
      '2025_3Q': { 'OC(국내)': 202040, '중국': 208506, '홍콩': 8019, 'ST미국': 2844, '기타': -256107 },
      '2025_3Q_Year': { 'OC(국내)': 449910, '중국': 547504, '홍콩': 24678, 'ST미국': 7147, '기타': -568091 },
      '2025_4Q': { 'OC(국내)': 170198, '중국': 183758, '홍콩': 10131, 'ST미국': 5427, '기타': -188477 },
      '2025_Year': { 'OC(국내)': 620108, '중국': 731262, '홍콩': 34809, 'ST미국': 12574, '기타': -756568 },
    },
    '매출총이익': {
      '2024_1Q': { 'OC(국내)': 241223, '중국': 65297, '홍콩': 12979, 'ST미국': 7177, '기타': 5807 },
      '2024_1Q_Year': { 'OC(국내)': 241223, '중국': 65297, '홍콩': 12979, 'ST미국': 7177, '기타': 5807 },
      '2024_2Q': { 'OC(국내)': 185826, '중국': 50908, '홍콩': 9736, 'ST미국': 7246, '기타': 17582 },
      '2024_2Q_Year': { 'OC(국내)': 427049, '중국': 116205, '홍콩': 22715, 'ST미국': 14423, '기타': 23389 },
      '2024_3Q': { 'OC(국내)': 258489, '중국': 51327, '홍콩': 8424, 'ST미국': 6015, '기타': -39334 },
      '2024_3Q_Year': { 'OC(국내)': 685538, '중국': 167532, '홍콩': 31139, 'ST미국': 20438, '기타': -15945 },
      '2024_4Q': { 'OC(국내)': 288841, '중국': 26140, '홍콩': 11827, 'ST미국': 7620, '기타': 23860 },
      '2024_Year': { 'OC(국내)': 974379, '중국': 193672, '홍콩': 42966, 'ST미국': 28058, '기타': 7915 },
      '2025_1Q': { 'OC(국내)': 251676, '중국': 54762, '홍콩': 10991, 'ST미국': 6539, '기타': 5765 },
      '2025_1Q_Year': { 'OC(국내)': 251676, '중국': 54762, '홍콩': 10991, 'ST미국': 6539, '기타': 5765 },
      '2025_2Q': { 'OC(국내)': 204615, '중국': 35481, '홍콩': 8754, 'ST미국': 6631, '기타': 3425 },
      '2025_2Q_Year': { 'OC(국내)': 456291, '중국': 90243, '홍콩': 19745, 'ST미국': 13170, '기타': 9190 },
      '2025_3Q': { 'OC(국내)': 308629, '중국': 75412, '홍콩': 8888, 'ST미국': 13087, '기타': -97062 },
      '2025_3Q_Year': { 'OC(국내)': 764920, '중국': 165655, '홍콩': 28633, 'ST미국': 26257, '기타': -87872 },
      '2025_4Q': { 'OC(국내)': 309663, '중국': 63413, '홍콩': 12830, 'ST미국': 9727, '기타': -1419 },
      '2025_Year': { 'OC(국내)': 1074583, '중국': 229068, '홍콩': 41463, 'ST미국': 35984, '기타': -89291 },
    },
    '인건비': {
      '2024_1Q': { 'OC(국내)': 9937, '중국': 6512, '홍콩': 1928, 'ST미국': 705, '기타': 576 },
      '2024_1Q_Year': { 'OC(국내)': 9937, '중국': 6512, '홍콩': 1928, 'ST미국': 705, '기타': 576 },
      '2024_2Q': { 'OC(국내)': 11938, '중국': 6388, '홍콩': 1977, 'ST미국': 1061, '기타': 636 },
      '2024_2Q_Year': { 'OC(국내)': 21875, '중국': 12900, '홍콩': 3905, 'ST미국': 1766, '기타': 1212 },
      '2024_3Q': { 'OC(국내)': 10187, '중국': 6042, '홍콩': 1724, 'ST미국': 1270, '기타': 702 },
      '2024_3Q_Year': { 'OC(국내)': 32062, '중국': 18942, '홍콩': 5629, 'ST미국': 3036, '기타': 1914 },
      '2024_4Q': { 'OC(국내)': 11626, '중국': 7185, '홍콩': 2181, 'ST미국': 1128, '기타': 563 },
      '2024_Year': { 'OC(국내)': 43688, '중국': 26127, '홍콩': 7810, 'ST미국': 4164, '기타': 2477 },
      '2025_1Q': { 'OC(국내)': 9754, '중국': 7850, '홍콩': 2409, 'ST미국': 1088, '기타': 537 },
      '2025_1Q_Year': { 'OC(국내)': 9754, '중국': 7850, '홍콩': 2409, 'ST미국': 1088, '기타': 537 },
      '2025_2Q': { 'OC(국내)': 10692, '중국': 7019, '홍콩': 1717, 'ST미국': 822, '기타': 625 },
      '2025_2Q_Year': { 'OC(국내)': 20446, '중국': 14869, '홍콩': 4126, 'ST미국': 1910, '기타': 1162 },
      '2025_3Q': { 'OC(국내)': 9632, '중국': 6734, '홍콩': 2155, 'ST미국': 1043, '기타': 701 },
      '2025_3Q_Year': { 'OC(국내)': 30078, '중국': 21603, '홍콩': 6281, 'ST미국': 2953, '기타': 1863 },
      '2025_4Q': { 'OC(국내)': 10445, '중국': 7284, '홍콩': 2661, 'ST미국': 1006, '기타': 633 },
      '2025_Year': { 'OC(국내)': 40523, '중국': 28887, '홍콩': 8942, 'ST미국': 3959, '기타': 2496 },
    },
    '광고선전비': {
      '2024_1Q': { 'OC(국내)': 10689, '중국': 12044, '홍콩': 422, 'ST미국': 937, '기타': 4 },
      '2024_1Q_Year': { 'OC(국내)': 10689, '중국': 12044, '홍콩': 422, 'ST미국': 937, '기타': 4 },
      '2024_2Q': { 'OC(국내)': 9145, '중국': 5745, '홍콩': 634, 'ST미국': 1430, '기타': 1 },
      '2024_2Q_Year': { 'OC(국내)': 19834, '중국': 17789, '홍콩': 1056, 'ST미국': 2367, '기타': 5 },
      '2024_3Q': { 'OC(국내)': 7102, '중국': 10838, '홍콩': 415, 'ST미국': 1542, '기타': 5 },
      '2024_3Q_Year': { 'OC(국내)': 26936, '중국': 28627, '홍콩': 1471, 'ST미국': 3909, '기타': 10 },
      '2024_4Q': { 'OC(국내)': 13417, '중국': 16640, '홍콩': 541, 'ST미국': 1578, '기타': 2 },
      '2024_Year': { 'OC(국내)': 40353, '중국': 45267, '홍콩': 2012, 'ST미국': 5487, '기타': 12 },
      '2025_1Q': { 'OC(국내)': 8142, '중국': 14553, '홍콩': 533, 'ST미국': 1379, '기타': 2 },
      '2025_1Q_Year': { 'OC(국내)': 8142, '중국': 14553, '홍콩': 533, 'ST미국': 1379, '기타': 2 },
      '2025_2Q': { 'OC(국내)': 8488, '중국': 9118, '홍콩': 554, 'ST미국': 1386, '기타': -7 },
      '2025_2Q_Year': { 'OC(국내)': 16630, '중국': 23671, '홍콩': 1087, 'ST미국': 2765, '기타': -5 },
      '2025_3Q': { 'OC(국내)': 6683, '중국': 16327, '홍콩': 584, 'ST미국': 1462, '기타': -25 },
      '2025_3Q_Year': { 'OC(국내)': 23313, '중국': 39998, '홍콩': 1671, 'ST미국': 4227, '기타': -30 },
      '2025_4Q': { 'OC(국내)': 13177, '중국': 20569, '홍콩': 1144, 'ST미국': 5049, '기타': -35 },
      '2025_Year': { 'OC(국내)': 36490, '중국': 60567, '홍콩': 2815, 'ST미국': 9276, '기타': -65 },
    },
    '수수료': {
      '2024_1Q': { 'OC(국내)': 103398, '중국': 6674, '홍콩': 3517, 'ST미국': 1537, '기타': -2477 },
      '2024_1Q_Year': { 'OC(국내)': 103398, '중국': 6674, '홍콩': 3517, 'ST미국': 1537, '기타': -2477 },
      '2024_2Q': { 'OC(국내)': 89435, '중국': 6021, '홍콩': 495, 'ST미국': 2037, '기타': 508 },
      '2024_2Q_Year': { 'OC(국내)': 192833, '중국': 12695, '홍콩': 4012, 'ST미국': 3574, '기타': -1969 },
      '2024_3Q': { 'OC(국내)': 82954, '중국': 4851, '홍콩': -263, 'ST미국': 2108, '기타': 1119 },
      '2024_3Q_Year': { 'OC(국내)': 275787, '중국': 17546, '홍콩': 3749, 'ST미국': 5682, '기타': -850 },
      '2024_4Q': { 'OC(국내)': 121113, '중국': 8552, '홍콩': 551, 'ST미국': -1166, '기타': 402 },
      '2024_Year': { 'OC(국내)': 396900, '중국': 26098, '홍콩': 4300, 'ST미국': 4516, '기타': -448 },
      '2025_1Q': { 'OC(국내)': 98102, '중국': 8798, '홍콩': 1124, 'ST미국': 1128, '기타': -292 },
      '2025_1Q_Year': { 'OC(국내)': 98102, '중국': 8798, '홍콩': 1124, 'ST미국': 1128, '기타': -292 },
      '2025_2Q': { 'OC(국내)': 82021, '중국': 7042, '홍콩': 892, 'ST미국': 1403, '기타': -712 },
      '2025_2Q_Year': { 'OC(국내)': 180123, '중국': 15840, '홍콩': 2016, 'ST미국': 2531, '기타': -1004 },
      '2025_3Q': { 'OC(국내)': 78829, '중국': 6166, '홍콩': 1202, 'ST미국': 1306, '기타': 86 },
      '2025_3Q_Year': { 'OC(국내)': 258952, '중국': 22006, '홍콩': 3218, 'ST미국': 3837, '기타': -918 },
      '2025_4Q': { 'OC(국내)': 120391, '중국': 12717, '홍콩': -650, 'ST미국': 12768, '기타': 1701 },
      '2025_Year': { 'OC(국내)': 379343, '중국': 34723, '홍콩': 2568, 'ST미국': 16605, '기타': 783 },
    },
    '감가상각비': {
      '2024_1Q': { 'OC(국내)': 10413, '중국': 5331, '홍콩': 3792, 'ST미국': 148, '기타': 880 },
      '2024_1Q_Year': { 'OC(국내)': 10413, '중국': 5331, '홍콩': 3792, 'ST미국': 148, '기타': 880 },
      '2024_2Q': { 'OC(국내)': 10777, '중국': 6017, '홍콩': 3759, 'ST미국': -150, '기타': 1134 },
      '2024_2Q_Year': { 'OC(국내)': 21190, '중국': 11348, '홍콩': 7551, 'ST미국': -2, '기타': 2014 },
      '2024_3Q': { 'OC(국내)': 11821, '중국': 6247, '홍콩': 3540, 'ST미국': 344, '기타': 1314 },
      '2024_3Q_Year': { 'OC(국내)': 33011, '중국': 17595, '홍콩': 11091, 'ST미국': 342, '기타': 3328 },
      '2024_4Q': { 'OC(국내)': 12446, '중국': 6711, '홍콩': 3263, 'ST미국': 120, '기타': 898 },
      '2024_Year': { 'OC(국내)': 45457, '중국': 24306, '홍콩': 14354, 'ST미국': 462, '기타': 4226 },
      '2025_1Q': { 'OC(국내)': 12795, '중국': 7629, '홍콩': 3123, 'ST미국': 118, '기타': 842 },
      '2025_1Q_Year': { 'OC(국내)': 12795, '중국': 7629, '홍콩': 3123, 'ST미국': 118, '기타': 842 },
      '2025_2Q': { 'OC(국내)': 13172, '중국': 6120, '홍콩': 1876, 'ST미국': 121, '기타': 825 },
      '2025_2Q_Year': { 'OC(국내)': 25967, '중국': 13749, '홍콩': 4999, 'ST미국': 239, '기타': 1667 },
      '2025_3Q': { 'OC(국내)': 12849, '중국': 5468, '홍콩': 3008, 'ST미국': 118, '기타': 818 },
      '2025_3Q_Year': { 'OC(국내)': 38816, '중국': 19217, '홍콩': 8007, 'ST미국': 357, '기타': 2485 },
      '2025_4Q': { 'OC(국내)': 12720, '중국': 5799, '홍콩': 3462, 'ST미국': 119, '기타': 861 },
      '2025_Year': { 'OC(국내)': 51536, '중국': 25016, '홍콩': 11469, 'ST미국': 476, '기타': 3346 },
    },
    '기타판관비': {
      '2024_1Q': { 'OC(국내)': 11333, '중국': 10054, '홍콩': 2670, 'ST미국': 1260, '기타': -12 },
      '2024_1Q_Year': { 'OC(국내)': 11333, '중국': 10054, '홍콩': 2670, 'ST미국': 1260, '기타': -12 },
      '2024_2Q': { 'OC(국내)': 10453, '중국': 6031, '홍콩': 2375, 'ST미국': 1707, '기타': -57 },
      '2024_2Q_Year': { 'OC(국내)': 21786, '중국': 16085, '홍콩': 5045, 'ST미국': 2967, '기타': -69 },
      '2024_3Q': { 'OC(국내)': 9321, '중국': 10054, '홍콩': 2552, 'ST미국': 1183, '기타': -356 },
      '2024_3Q_Year': { 'OC(국내)': 31107, '중국': 26139, '홍콩': 7597, 'ST미국': 4150, '기타': -425 },
      '2024_4Q': { 'OC(국내)': 14468, '중국': 9636, '홍콩': 3536, 'ST미국': 2377, '기타': 100 },
      '2024_Year': { 'OC(국내)': 45575, '중국': 35775, '홍콩': 11133, 'ST미국': 6527, '기타': -325 },
      '2025_1Q': { 'OC(국내)': 10906, '중국': 9821, '홍콩': 3799, 'ST미국': 1829, '기타': 147 },
      '2025_1Q_Year': { 'OC(국내)': 10906, '중국': 9821, '홍콩': 3799, 'ST미국': 1829, '기타': 147 },
      '2025_2Q': { 'OC(국내)': 9642, '중국': 6522, '홍콩': 3527, 'ST미국': 1905, '기타': 106 },
      '2025_2Q_Year': { 'OC(국내)': 20548, '중국': 16343, '홍콩': 7326, 'ST미국': 3734, '기타': 253 },
      '2025_3Q': { 'OC(국내)': 8069, '중국': 10664, '홍콩': 3186, 'ST미국': 3728, '기타': 141 },
      '2025_3Q_Year': { 'OC(국내)': 28617, '중국': 27007, '홍콩': 10512, 'ST미국': 7462, '기타': 394 },
      '2025_4Q': { 'OC(국내)': 13623, '중국': 12658, '홍콩': 3539, 'ST미국': -427, '기타': 123 },
      '2025_Year': { 'OC(국내)': 42240, '중국': 39665, '홍콩': 14051, 'ST미국': 7035, '기타': 517 },
    },
    '영업이익': {
      '2024_1Q': { 'OC(국내)': 95453, '중국': 24681, '홍콩': 650, 'ST미국': 2590, '기타': 6837 },
      '2024_1Q_Year': { 'OC(국내)': 95453, '중국': 24681, '홍콩': 650, 'ST미국': 2590, '기타': 6837 },
      '2024_2Q': { 'OC(국내)': 54078, '중국': 20705, '홍콩': 496, 'ST미국': -2591, '기타': 19113 },
      '2024_2Q_Year': { 'OC(국내)': 149531, '중국': 45386, '홍콩': 1146, 'ST미국': -1, '기타': 25950 },
      '2024_3Q': { 'OC(국내)': 137103, '중국': 13295, '홍콩': 455, 'ST미국': 3320, '기타': -45869 },
      '2024_3Q_Year': { 'OC(국내)': 286634, '중국': 58681, '홍콩': 1601, 'ST미국': 3319, '기타': -19919 },
      '2024_4Q': { 'OC(국내)': 115771, '중국': -22584, '홍콩': 1754, 'ST미국': 3582, '기타': 21897 },
      '2024_Year': { 'OC(국내)': 402405, '중국': 36097, '홍콩': 3355, 'ST미국': 6901, '기타': 1978 },
      '2025_1Q': { 'OC(국내)': 111977, '중국': 6110, '홍콩': 2, 'ST미국': 996, '기타': 4531 },
      '2025_1Q_Year': { 'OC(국내)': 111977, '중국': 6110, '홍콩': 2, 'ST미국': 996, '기타': 4531 },
      '2025_2Q': { 'OC(국내)': 80599, '중국': -341, '홍콩': 187, 'ST미국': 993, '기타': 2591 },
      '2025_2Q_Year': { 'OC(국내)': 192576, '중국': 5769, '홍콩': 189, 'ST미국': 1989, '기타': 7122 },
      '2025_3Q': { 'OC(국내)': 192567, '중국': 30053, '홍콩': -1247, 'ST미국': 5429, '기타': -98783 },
      '2025_3Q_Year': { 'OC(국내)': 385143, '중국': 35822, '홍콩': -1058, 'ST미국': 7418, '기타': -91661 },
      '2025_4Q': { 'OC(국내)': 139306, '중국': 4385, '홍콩': 2673, 'ST미국': -8788, '기타': -4700 },
      '2025_Year': { 'OC(국내)': 524449, '중국': 40207, '홍콩': 1615, 'ST미국': -1370, '기타': -96361 },
    },
    '당기순이익': {
      '2024_1Q': { 'OC(국내)': 72186, '중국': 18059, '홍콩': 318, 'ST미국': 2208, '기타': 3550 },
      '2024_1Q_Year': { 'OC(국내)': 72186, '중국': 18059, '홍콩': 318, 'ST미국': 2208, '기타': 3550 },
      '2024_2Q': { 'OC(국내)': 48504, '중국': 15349, '홍콩': 267, 'ST미국': -2157, '기타': 11988 },
      '2024_2Q_Year': { 'OC(국내)': 120690, '중국': 33408, '홍콩': 585, 'ST미국': 51, '기타': 15538 },
      '2024_3Q': { 'OC(국내)': 105886, '중국': 9478, '홍콩': 1, 'ST미국': -528, '기타': -35036 },
      '2024_3Q_Year': { 'OC(국내)': 226576, '중국': 42886, '홍콩': 586, 'ST미국': -477, '기타': -19498 },
      '2024_4Q': { 'OC(국내)': 96955, '중국': -17666, '홍콩': 1540, 'ST미국': -3392, '기타': 28448 },
      '2024_Year': { 'OC(국내)': 323531, '중국': 25220, '홍콩': 2126, 'ST미국': -3869, '기타': 8950 },
      '2025_1Q': { 'OC(국내)': 79838, '중국': 3692, '홍콩': -174, 'ST미국': -3054, '기타': 2267 },
      '2025_1Q_Year': { 'OC(국내)': 79838, '중국': 3692, '홍콩': -174, 'ST미국': -3054, '기타': 2267 },
      '2025_2Q': { 'OC(국내)': 64206, '중국': -1458, '홍콩': 397, 'ST미국': -2519, '기타': 2012 },
      '2025_2Q_Year': { 'OC(국내)': 144044, '중국': 2234, '홍콩': 223, 'ST미국': -5573, '기타': 4279 },
      '2025_3Q': { 'OC(국내)': 150942, '중국': 21685, '홍콩': -1312, 'ST미국': 2759, '기타': -73379 },
      '2025_3Q_Year': { 'OC(국내)': 294986, '중국': 23919, '홍콩': -1089, 'ST미국': -2814, '기타': -69100 },
      '2025_4Q': { 'OC(국내)': 104502, '중국': 2426, '홍콩': 2129, 'ST미국': -1412, '기타': 49163 },
      '2025_Year': { 'OC(국내)': 399488, '중국': 26345, '홍콩': 1040, 'ST미국': -4226, '기타': -19937 },
    },
  };

  // ============================================
  // 법인별 재무상태표 데이터 (컴포넌트 상위 레벨)
  // entity_bs_data.json 기반 업데이트 (단위: 백만원)
  // ============================================
  const entityBSData = {
    '2024_1Q': {
      현금성자산: { 'OC(국내)': 291693, 중국: 12162, 홍콩: 4132, ST미국: 22754, 기타: 3966 },
      매출채권: { 'OC(국내)': 109224, 중국: 7225, 홍콩: 3399, ST미국: 3441, 기타: -40920 },
      재고자산: { 'OC(국내)': 232095, 중국: 136110, 홍콩: 33179, ST미국: 4244, 기타: -81792 },
      유형자산: { 'OC(국내)': 130119, 중국: 6652, 홍콩: 3560, ST미국: 48, 기타: 478 },
      투자자산: { 'OC(국내)': 713027, 중국: 0, 홍콩: 0, ST미국: 0, 기타: -61516 },
      차입금: { 'OC(국내)': 0, 중국: 72442, 홍콩: 0, ST미국: 9051, 기타: -8751 },
      매입채무: { 'OC(국내)': 69104, 중국: 5104, 홍콩: 45034, ST미국: 1191, 기타: -44537 },
      유동자산: { 'OC(국내)': 669592, 중국: 211429, 홍콩: 43691, ST미국: 33106, 기타: -158204 },
      비유동자산: { 'OC(국내)': 1095826, 중국: 60491, 홍콩: 20923, ST미국: 66182, 기타: 14334 },
      유동부채: { 'OC(국내)': 354161, 중국: 174209, 홍콩: 57363, ST미국: 13068, 기타: -81346 },
      비유동부채: { 'OC(국내)': 138707, 중국: 27039, 홍콩: 6697, ST미국: 1364, 기타: 16387 },
      이익잉여금: { 'OC(국내)': 971301, 중국: 54689, 홍콩: 1337, ST미국: -5831, 기타: -2617 },
      자산총계: { 'OC(국내)': 1765417, 중국: 271920, 홍콩: 64615, ST미국: 99288, 기타: -143870 },
      부채총계: { 'OC(국내)': 492867, 중국: 201248, 홍콩: 64061, ST미국: 14432, 기타: -64959 },
      자본총계: { 'OC(국내)': 1272550, 중국: 70672, 홍콩: 554, ST미국: 84856, 기타: -78911 },
    },
    '2024_2Q': {
      현금성자산: { 'OC(국내)': 161519, 중국: 27175, 홍콩: 3743, ST미국: 23099, 기타: 5075 },
      매출채권: { 'OC(국내)': 91507, 중국: 7183, 홍콩: 2816, ST미국: 5174, 기타: -38821 },
      재고자산: { 'OC(국내)': 207444, 중국: 115040, 홍콩: 30582, ST미국: 4806, 기타: -64973 },
      유형자산: { 'OC(국내)': 181330, 중국: 6936, 홍콩: 3398, ST미국: 66, 기타: 449 },
      투자자산: { 'OC(국내)': 722577, 중국: 0, 홍콩: 0, ST미국: 0, 기타: -71320 },
      차입금: { 'OC(국내)': 0, 중국: 0, 홍콩: 0, ST미국: 9440, 기타: -9140 },
      매입채무: { 'OC(국내)': 48681, 중국: 1415, 홍콩: 42027, ST미국: 3799, 기타: -32966 },
      유동자산: { 'OC(국내)': 485999, 중국: 177683, 홍콩: 40576, ST미국: 37121, 기타: -118307 },
      비유동자산: { 'OC(국내)': 1150711, 중국: 65550, 홍콩: 18592, ST미국: 68165, 기타: 287 },
      유동부채: { 'OC(국내)': 195197, 중국: 125339, 홍콩: 52622, ST미국: 15764, 기타: -64084 },
      비유동부채: { 'OC(국내)': 135731, 중국: 30004, 홍콩: 5819, ST미국: 1404, 기타: 16445 },
      이익잉여금: { 'OC(국내)': 1019471, 중국: 70038, 홍콩: 1604, ST미국: -5328, 기타: 6940 },
      자산총계: { 'OC(국내)': 1636710, 중국: 243233, 홍콩: 59168, ST미국: 105286, 기타: -118020 },
      부채총계: { 'OC(국내)': 330928, 중국: 155343, 홍콩: 58441, ST미국: 17169, 기타: -47639 },
      자본총계: { 'OC(국내)': 1305782, 중국: 87890, 홍콩: 727, ST미국: 88118, 기타: -70382 },
    },
    '2024_3Q': {
      현금성자산: { 'OC(국내)': 142325, 중국: 24304, 홍콩: 3061, ST미국: 19294, 기타: 1438 },
      매출채권: { 'OC(국내)': 137912, 중국: 81857, 홍콩: 2230, ST미국: 6587, 기타: -93341 },
      재고자산: { 'OC(국내)': 247068, 중국: 174481, 홍콩: 34086, ST미국: 5150, 기타: -99048 },
      유형자산: { 'OC(국내)': 224642, 중국: 6775, 홍콩: 2649, ST미국: 64, 기타: 376 },
      투자자산: { 'OC(국내)': 699958, 중국: 0, 홍콩: 0, ST미국: 0, 기타: -52885 },
      차입금: { 'OC(국내)': 0, 중국: 86820, 홍콩: 0, ST미국: 0, 기타: 0 },
      매입채무: { 'OC(국내)': 115166, 중국: 63397, 홍콩: 43473, ST미국: 1942, 기타: -93366 },
      유동자산: { 'OC(국내)': 583615, 중국: 298702, 홍콩: 43269, ST미국: 33198, 기타: -174882 },
      비유동자산: { 'OC(국내)': 1222861, 중국: 64669, 홍콩: 16570, ST미국: 64647, 기타: -13171 },
      유동부채: { 'OC(국내)': 260933, 중국: 238067, 홍콩: 53188, ST미국: 4631, 기타: -89778 },
      비유동부채: { 'OC(국내)': 136287, 중국: 28807, 홍콩: 5837, ST미국: 11729, 기타: 5090 },
      이익잉여금: { 'OC(국내)': 1125421, 중국: 79517, 홍콩: 1606, ST미국: -8634, 기타: -21546 },
      자산총계: { 'OC(국내)': 1806476, 중국: 363370, 홍콩: 59839, ST미국: 97845, 기타: -188052 },
      부채총계: { 'OC(국내)': 397220, 중국: 266874, 홍콩: 59025, ST미국: 16360, 기타: -84689 },
      자본총계: { 'OC(국내)': 1409256, 중국: 96496, 홍콩: 814, ST미국: 81486, 기타: -103365 },
    },
    '2024_4Q': {
      현금성자산: { 'OC(국내)': 61500, 중국: 29229, 홍콩: 6073, ST미국: 22881, 기타: 150 },
      매출채권: { 'OC(국내)': 134453, 중국: 40081, 홍콩: 3967, ST미국: 7463, 기타: -47982 },
      재고자산: { 'OC(국내)': 214281, 중국: 141223, 홍콩: 35205, ST미국: 8723, 기타: -74440 },
      유형자산: { 'OC(국내)': 491253, 중국: 7121, 홍콩: 2479, ST미국: 71, 기타: 383 },
      투자자산: { 'OC(국내)': 707434, 중국: 0, 홍콩: 0, ST미국: 0, 기타: -41870 },
      차입금: { 'OC(국내)': 45000, 중국: 100635, 홍콩: 0, ST미국: 0, 기타: 0 },
      매입채무: { 'OC(국내)': 79795, 중국: 17885, 홍콩: 47089, ST미국: 6030, 기타: -48114 },
      유동자산: { 'OC(국내)': 441579, 중국: 256681, 홍콩: 48824, ST미국: 40431, 기타: -150721 },
      비유동자산: { 'OC(국내)': 1481924, 중국: 79929, 홍콩: 18420, ST미국: 71898, 기타: -3060 },
      유동부채: { 'OC(국내)': 305881, 중국: 218918, 홍콩: 59408, ST미국: 9779, 기타: -71877 },
      비유동부채: { 'OC(국내)': 123905, 중국: 33979, 홍콩: 5504, ST미국: 17189, 기타: 5920 },
      이익잉여금: { 'OC(국내)': 1222495, 중국: 61851, 홍콩: 3146, ST미국: -11153, 기타: 7016 },
      자산총계: { 'OC(국내)': 1923504, 중국: 336611, 홍콩: 67244, ST미국: 112329, 기타: -153783 },
      부채총계: { 'OC(국내)': 429786, 중국: 252897, 홍콩: 64912, ST미국: 26968, 기타: -65956 },
      자본총계: { 'OC(국내)': 1493718, 중국: 83714, 홍콩: 2333, ST미국: 85361, 기타: -87828 },
    },
    '2025_1Q': {
      현금성자산: { 'OC(국내)': 79496, 중국: 60404, 홍콩: 7022, ST미국: 16283, 기타: 839 },
      매출채권: { 'OC(국내)': 123193, 중국: 20896, 홍콩: 2465, ST미국: 8621, 기타: -63936 },
      재고자산: { 'OC(국내)': 214607, 중국: 123617, 홍콩: 33553, ST미국: 9993, 기타: -67718 },
      유형자산: { 'OC(국내)': 494287, 중국: 5879, 홍콩: 1887, ST미국: 72, 기타: 361 },
      투자자산: { 'OC(국내)': 713076, 중국: 0, 홍콩: 0, ST미국: 0, 기타: -50365 },
      차입금: { 'OC(국내)': 20000, 중국: 56470, 홍콩: 0, ST미국: 0, 기타: 0 },
      매입채무: { 'OC(국내)': 69813, 중국: 28622, 홍콩: 44833, ST미국: 3153, 기타: -64453 },
      유동자산: { 'OC(국내)': 452307, 중국: 220602, 홍콩: 46719, ST미국: 36564, 기타: -134762 },
      비유동자산: { 'OC(국내)': 1492197, 중국: 69472, 홍콩: 18311, ST미국: 71798, 기타: -15259 },
      유동부채: { 'OC(국내)': 308799, 중국: 172560, 홍콩: 57271, ST미국: 6850, 기타: -64035 },
      비유동부채: { 'OC(국내)': 126330, 중국: 29892, 홍콩: 5706, ST미국: 20977, 기타: -376 },
      이익잉여금: { 'OC(국내)': 1238228, 중국: 65544, 홍콩: 2973, ST미국: -13973, 기타: 9488 },
      자산총계: { 'OC(국내)': 1944504, 중국: 290073, 홍콩: 65030, ST미국: 108362, 기타: -150019 },
      부채총계: { 'OC(국내)': 435129, 중국: 202453, 홍콩: 62976, ST미국: 27826, 기타: -64410 },
      자본총계: { 'OC(국내)': 1509375, 중국: 87621, 홍콩: 2054, ST미국: 80536, 기타: -85610 },
    },
    '2025_2Q': {
      현금성자산: { 'OC(국내)': 88735, 중국: 20311, 홍콩: 4732, ST미국: 12241, 기타: 421 },
      매출채권: { 'OC(국내)': 81953, 중국: 8793, 홍콩: 3324, ST미국: 7117, 기타: -40009 },
      재고자산: { 'OC(국내)': 199308, 중국: 113822, 홍콩: 29260, ST미국: 9317, 기타: -58357 },
      유형자산: { 'OC(국내)': 425086, 중국: 4660, 홍콩: 2490, ST미국: 61, 기타: 341 },
      투자자산: { 'OC(국내)': 714229, 중국: 0, 홍콩: 0, ST미국: 0, 기타: -52262 },
      차입금: { 'OC(국내)': 0, 중국: 32157, 홍콩: 0, ST미국: 0, 기타: 0 },
      매입채무: { 'OC(국내)': 53644, 중국: 10263, 홍콩: 39679, ST미국: 3362, 기타: -38494 },
      유동자산: { 'OC(국내)': 408047, 중국: 167130, 홍콩: 41048, ST미국: 33539, 기타: -110363 },
      비유동자산: { 'OC(국내)': 1483356, 중국: 64553, 홍콩: 15263, ST미국: 66122, 기타: -17995 },
      유동부채: { 'OC(국내)': 192917, 중국: 124707, 홍콩: 49960, ST미국: 6598, 기타: -49258 },
      비유동부채: { 'OC(국내)': 125656, 중국: 26148, 홍콩: 3027, ST미국: 19395, 기타: 3794 },
      이익잉여금: { 'OC(국내)': 1301970, 중국: 64087, 홍콩: 3370, ST미국: -16515, 기타: 11690 },
      자산총계: { 'OC(국내)': 1891404, 중국: 231683, 홍콩: 56311, ST미국: 99662, 기타: -128360 },
      부채총계: { 'OC(국내)': 318573, 중국: 150855, 홍콩: 52987, ST미국: 25993, 기타: -45464 },
      자본총계: { 'OC(국내)': 1572831, 중국: 80828, 홍콩: 3324, ST미국: 73668, 기타: -82895 },
    },
    '2025_3Q': {
      현금성자산: { 'OC(국내)': 182075, 중국: 9318, 홍콩: 4446, ST미국: 11400, 기타: 1046 },
      매출채권: { 'OC(국내)': 205309, 중국: 97531, 홍콩: 2871, ST미국: 16277, 기타: -162879 },
      재고자산: { 'OC(국내)': 242024, 중국: 281973, 홍콩: 34165, ST미국: 12558, 기타: -156694 },
      유형자산: { 'OC(국내)': 414573, 중국: 5132, 홍콩: 3082, ST미국: 59, 기타: 328 },
      투자자산: { 'OC(국내)': 720011, 중국: 0, 홍콩: 0, ST미국: 0, 기타: -57764 },
      차입금: { 'OC(국내)': 0, 중국: 160605, 홍콩: 0, ST미국: 0, 기타: 0 },
      매입채무: { 'OC(국내)': 139941, 중국: 131315, 홍콩: 47089, ST미국: 3739, 기타: -163567 },
      유동자산: { 'OC(국내)': 664251, 중국: 430259, 홍콩: 45030, ST미국: 43158, 기타: -321480 },
      비유동자산: { 'OC(국내)': 1480945, 중국: 65505, 홍콩: 26191, ST미국: 68239, 기타: -1437 },
      유동부채: { 'OC(국내)': 302647, 중국: 364920, 홍콩: 60057, ST미국: 6953, 기타: -161014 },
      비유동부채: { 'OC(국내)': 121061, 중국: 24901, 홍콩: 9454, ST미국: 25808, 기타: -4624 },
      이익잉여금: { 'OC(국내)': 1453309, 중국: 85773, 홍콩: 2059, ST미국: -16489, 기타: -61405 },
      자산총계: { 'OC(국내)': 2145196, 중국: 495765, 홍콩: 71221, ST미국: 111397, 기타: -322917 },
      부채총계: { 'OC(국내)': 423707, 중국: 389821, 홍콩: 69512, ST미국: 32762, 기타: -165640 },
      자본총계: { 'OC(국내)': 1721489, 중국: 105943, 홍콩: 1710, ST미국: 78635, 기타: -157277 },
    },
    '2025_4Q': {
      현금성자산: { 'OC(국내)': 270871, 중국: 12231, 홍콩: 5369, ST미국: 36527, 기타: 386 },
      매출채권: { 'OC(국내)': 198116, 중국: 68306, 홍콩: 4839, ST미국: 1182, 기타: -118993 },
      재고자산: { 'OC(국내)': 219274, 중국: 306452, 홍콩: 31190, ST미국: 9288, 기타: -163351 },
      유형자산: { 'OC(국내)': 412660, 중국: 4939, 홍콩: 3711, ST미국: 57, 기타: 305 },
      투자자산: { 'OC(국내)': 750934, 중국: 0, 홍콩: 0, ST미국: 0, 기타: -9022 },
      차입금: { 'OC(국내)': 0, 중국: 186267, 홍콩: 0, ST미국: 0, 기타: 0 },
      매입채무: { 'OC(국내)': 90452, 중국: 82388, 홍콩: 44694, ST미국: 6790, 기타: -119323 },
      유동자산: { 'OC(국내)': 716037, 중국: 418720, 홍콩: 44607, ST미국: 50448, 기타: -286328 },
      비유동자산: { 'OC(국내)': 1499461, 중국: 69389, 홍콩: 27221, ST미국: 69713, 기타: 42658 },
      유동부채: { 'OC(국내)': 280530, 중국: 349400, 홍콩: 58197, ST미국: 9982, 기타: -115701 },
      비유동부채: { 'OC(국내)': 111730, 중국: 26267, 홍콩: 9971, ST미국: 56835, 기타: -14860 },
      이익잉여금: { 'OC(국내)': 1558525, 중국: 88199, 홍콩: 4188, ST미국: -19074, 기타: -12023 },
      자산총계: { 'OC(국내)': 2215497, 중국: 488109, 홍콩: 71828, ST미국: 120161, 기타: -243670 },
      부채총계: { 'OC(국내)': 392260, 중국: 375667, 홍콩: 68168, ST미국: 66816, 기타: -130561 },
      자본총계: { 'OC(국내)': 1823238, 중국: 112443, 홍콩: 3660, ST미국: 53345, 기타: -113111 },
    },
  };
  // ============================================
  // AI 분석 함수
  // ============================================
  const generateAIAnalysis = () => {
    if (!selectedPeriod) {
      return {
        keyMetrics: {
          opMargin: { curr: 0, prev: 0, change: 0 },
          netMargin: { curr: 0, prev: 0, change: 0 },
          debtRatio: { curr: 0, prev: 0, status: '안정' },
          roe: { curr: 0, prev: 0, change: 0 }
        },
        insights: [],
        risks: [],
        actions: [],
        improvementTargets: []
      };
    }
    const selectedYearKey = getPeriodKey(selectedPeriod, 'year');
    const prevYearKey = getPeriodKey(selectedPeriod, 'prev_year') || '2024_Year';
    // 재무상태표는 분기별 데이터이므로 quarter 키 사용 (bsCurrentPeriod와 동일하게)
    const currentPeriod = bsCurrentPeriod; // 전역 변수 사용으로 일관성 확보
    const prevPeriod = bsPrevPeriod; // 전역 변수 사용으로 일관성 확보
    
    // 1) 핵심 지표 계산
    const salesCurr = incomeStatementData[selectedYearKey]?.매출액 || 0;
    const salesPrev = incomeStatementData[prevYearKey]?.매출액 || 0;
    const opIncomeCurr = incomeStatementData[selectedYearKey]?.영업이익 || 0;
    const opIncomePrev = incomeStatementData[prevYearKey]?.영업이익 || 0;
    const netIncomeCurr = incomeStatementData[selectedYearKey]?.당기순이익 || 0;
    const netIncomePrev = incomeStatementData[prevYearKey]?.당기순이익 || 0;
    
    // 재무상태표 데이터 확인 및 계산 (안전한 접근)
    const bsCurr = balanceSheetData?.[currentPeriod] || {};
    const bsPrev = balanceSheetData?.[prevPeriod] || {};
    const totalAssetsCurr = bsCurr.자산총계 || 0;
    const totalAssetsPrev = bsPrev.자산총계 || 0;
    const totalDebtCurr = bsCurr.부채총계 || 0;
    const totalDebtPrev = bsPrev.부채총계 || 0;
    const totalEquityCurr = bsCurr.자본총계 || 0;
    const totalEquityPrev = bsPrev.자본총계 || 0;
    
    const opMarginCurr = salesCurr > 0 ? (opIncomeCurr / salesCurr * 100) : 0;
    const opMarginPrev = salesPrev > 0 ? (opIncomePrev / salesPrev * 100) : 0;
    const netMarginCurr = salesCurr > 0 ? (netIncomeCurr / salesCurr * 100) : 0;
    const netMarginPrev = salesPrev > 0 ? (netIncomePrev / salesPrev * 100) : 0;
    
    // 부채비율 계산 (부채총계 / 자본총계 * 100)
    let debtRatioCurr = 0;
    if (totalEquityCurr > 0) {
      debtRatioCurr = (totalDebtCurr / totalEquityCurr * 100);
      if (!isFinite(debtRatioCurr) || isNaN(debtRatioCurr)) debtRatioCurr = 0;
    } else if (totalDebtCurr > 0) {
      debtRatioCurr = 999; // 자본이 0인 경우
    }
    
    let debtRatioPrev = 0;
    if (totalEquityPrev > 0) {
      debtRatioPrev = (totalDebtPrev / totalEquityPrev * 100);
      if (!isFinite(debtRatioPrev) || isNaN(debtRatioPrev)) debtRatioPrev = 0;
    } else if (totalDebtPrev > 0) {
      debtRatioPrev = 999;
    }
    
    // ROE 계산 (당기순이익 / 자본총계 * 100)
    let roeCurr = 0;
    if (totalEquityCurr > 0) {
      roeCurr = (netIncomeCurr / totalEquityCurr * 100);
      if (!isFinite(roeCurr) || isNaN(roeCurr)) roeCurr = 0;
    }
    
    let roePrev = 0;
    if (totalEquityPrev > 0) {
      roePrev = (netIncomePrev / totalEquityPrev * 100);
      if (!isFinite(roePrev) || isNaN(roePrev)) roePrev = 0;
    }
    
    const salesGrowth = salesPrev > 0 ? ((salesCurr - salesPrev) / salesPrev * 100) : 0;
    const opMarginChange = opMarginCurr - opMarginPrev;
    const netMarginChange = netMarginCurr - netMarginPrev;
    const roeChange = roeCurr - roePrev;
    
    // 2) 법인별 수익성 분석 (영업이익률 + ROE)
    // entityBSData도 같은 currentPeriod 사용 (fallback 적용됨)
    const entityBSPeriod = entityBSData[currentPeriod] ? currentPeriod : (currentPeriod === '2025_4Q' ? '2025_3Q' : currentPeriod);
    
    const entityProfitability = ['OC(국내)', '중국', '홍콩', 'ST미국', '기타'].map(entity => {
      const sales = entityData.매출액?.[selectedYearKey]?.[entity] || 0;
      const opIncome = entityData.영업이익?.[selectedYearKey]?.[entity] || 0;
      const netIncome = entityData.당기순이익?.[selectedYearKey]?.[entity] || 0;
      const margin = sales > 0 ? (opIncome / sales * 100) : 0;
      
      // 법인별 ROE 계산 (법인별 당기순이익 / 법인별 자본총계 * 100)
      const entityEquity = (entityBSData && entityBSData[entityBSPeriod] && entityBSData[entityBSPeriod].자본총계) 
        ? (entityBSData[entityBSPeriod].자본총계[entity] || 0) 
        : 0;
      let entityROE = 0;
      if (entityEquity > 0) {
        entityROE = (netIncome / entityEquity * 100);
        if (!isFinite(entityROE) || isNaN(entityROE)) entityROE = 0;
      }
      
      return { entity, sales, opIncome, netIncome, margin, equity: entityEquity, roe: entityROE };
    }).sort((a, b) => b.margin - a.margin);
    
    // 3) 판관비 구조 분석
    const sgaBreakdown = ['인건비', '광고선전비', '수수료', '감가상각비', '기타판관비'].map(item => {
      const curr = incomeStatementData[selectedYearKey]?.[item] || 0;
      const prev = incomeStatementData[prevYearKey]?.[item] || 0;
      const change = prev > 0 ? ((curr - prev) / prev * 100) : 0;
      const salesRatio = salesCurr > 0 ? (curr / salesCurr * 100) : 0;
      return { item, curr, prev, change, salesRatio };
    }).sort((a, b) => b.curr - a.curr);
    
    // 4) 재무안정성 분석
    const cashCurr = bsCurr.현금및현금성자산 || bsCurr.현금성자산 || 0;
    const cashPrev = bsPrev.현금및현금성자산 || bsPrev.현금성자산 || 0;
    const arCurr = bsCurr.매출채권 || 0;
    const inventoryCurr = bsCurr.재고자산 || 0;
    const inventoryPrev = bsPrev.재고자산 || 0;
    const apCurr = bsCurr.매입채무 || 0;
    const workingCapitalCurr = arCurr + inventoryCurr - apCurr;
    
    const inventoryGrowth = inventoryPrev > 0 ? ((inventoryCurr - inventoryPrev) / inventoryPrev * 100) : 0;
    const cashGrowth = cashPrev > 0 ? ((cashCurr - cashPrev) / cashPrev * 100) : 0;
    
    // 5) 차입금 분석 (entityBSPeriod 사용)
    const borrowingsByEntity = ['OC(국내)', '중국', '홍콩', 'ST미국'].map(entity => {
      const debt = (entityBSData && entityBSData[entityBSPeriod] && entityBSData[entityBSPeriod].차입금) ? (entityBSData[entityBSPeriod].차입금[entity] || 0) : 0;
      const equity = (entityBSData && entityBSData[entityBSPeriod] && entityBSData[entityBSPeriod].자본총계) ? (entityBSData[entityBSPeriod].자본총계[entity] || 0) : 0;
      const debtRatio = equity > 0 ? (debt / equity * 100) : 0;
      return { entity, debt, equity, debtRatio };
    }).filter(x => x.debt > 0).sort((a, b) => b.debt - a.debt);
    
    const totalBorrowing = borrowingsByEntity.reduce((sum, x) => sum + x.debt, 0);
    
    // 6) 회전율 분석
    const inventoryTurnover = (salesCurr > 0 && inventoryCurr > 0) ? (salesCurr / inventoryCurr) : 0;
    const inventoryDays = inventoryTurnover > 0 ? (365 / inventoryTurnover) : 0;
    const arTurnover = (salesCurr > 0 && arCurr > 0) ? (salesCurr / arCurr) : 0;
    const arDays = arTurnover > 0 ? (365 / arTurnover) : 0;
    const apTurnover = (salesCurr > 0 && apCurr > 0) ? (salesCurr / apCurr) : 0;
    const apDays = apTurnover > 0 ? (365 / apTurnover) : 0;
    const cashConversionCycle = (arDays || 0) + (inventoryDays || 0) - (apDays || 0);
    
    // 7) 매출총이익률 분석
    const grossProfitCurr = incomeStatementData[selectedYearKey]?.매출총이익 || 0;
    const grossProfitPrev = incomeStatementData[prevYearKey]?.매출총이익 || 0;
    const grossMarginCurr = salesCurr > 0 ? (grossProfitCurr / salesCurr * 100) : 0;
    const grossMarginPrev = salesPrev > 0 ? (grossProfitPrev / salesPrev * 100) : 0;
    const grossMarginChange = grossMarginCurr - grossMarginPrev;
    
    // 8) 인사이트 생성
    const insights = [];
    const risks = [];
    const actions = [];
    const improvementTargets = []; // 개선 타겟 배열 초기화
    
    // 수익성 인사이트
    if (opMarginChange > 0) {
      insights.push({
        title: '영업이익률 개선',
        desc: `${opMarginCurr.toFixed(1)}%로 ${Math.abs(opMarginChange).toFixed(1)}%p 상승. ${
          salesGrowth < 0 ? '매출 감소에도 비용 관리 효과로 수익성 개선' : '매출 성장과 함께 수익성 동반 상승'
        }`
      });
    } else if (opMarginChange < -1) {
      risks.push({
        title: '수익성 악화',
        desc: `영업이익률 ${opMarginCurr.toFixed(1)}%로 ${Math.abs(opMarginChange).toFixed(1)}%p 하락. 비용 구조 점검 필요`
      });
    }
    
    // 매출총이익률 분석
    if (grossMarginChange < -2) {
      risks.push({
        title: '매출총이익률 하락',
        desc: `${grossMarginCurr.toFixed(1)}%로 ${Math.abs(grossMarginChange).toFixed(1)}%p 하락. 원가 상승 또는 가격 경쟁 심화`
      });
      actions.push({
        title: '원가율 개선',
        desc: `협력업체 협상력 강화, 소싱 다변화, 생산 효율 개선으로 원가율 2%p 절감 목표`
      });
    } else if (grossMarginChange > 2) {
      insights.push({
        title: '매출총이익률 개선',
        desc: `${grossMarginCurr.toFixed(1)}%로 ${grossMarginChange.toFixed(1)}%p 상승. 원가 관리 및 제품믹스 최적화 효과`
      });
    }
    
    // 회전율 인사이트
    if (inventoryDays > 0 && inventoryDays < 1000 && inventoryDays > 120) {
      risks.push({
        title: '재고회전율 저하',
        desc: `재고회전일수 ${Math.round(inventoryDays)}일. 재고 적체로 인한 현금흐름 악화 및 평가손실 리스크`
      });
    } else if (inventoryDays > 0 && inventoryDays < 60) {
      insights.push({
        title: '재고 효율성 우수',
        desc: `재고회전일수 ${Math.round(inventoryDays)}일. 빠른 재고 회전으로 운전자본 효율 극대화`
      });
    }
    
    if (arDays > 0 && arDays < 1000 && arDays > 60) {
      risks.push({
        title: '매출채권 회수 지연',
        desc: `회수기간 ${Math.round(arDays)}일. 현금흐름 압박 및 대손 리스크 증가`
      });
      actions.push({
        title: '채권 관리 강화',
        desc: `거래처 신용평가 강화, 조기 회수 인센티브, 팩토링 활용으로 회수기간 45일 목표`
      });
    }
    
    if (cashConversionCycle > 0 && cashConversionCycle < 1000 && cashConversionCycle > 90) {
      risks.push({
        title: '현금순환주기 장기화',
        desc: `${Math.round(cashConversionCycle)}일 소요. 운전자본 부담 및 자금 효율 저하`
      });
    }
    
    // 법인별 수익성 분석 (상세)
    const topProfitEntity = entityProfitability.length > 0 ? entityProfitability[0] : null;
    const lowProfitEntity = entityProfitability.find(e => e.margin < 15 && e.sales > 50000);
    
    // 최고 수익성 법인
    if (topProfitEntity && topProfitEntity.margin > 25) {
      insights.push({
        title: `${topProfitEntity.entity} 수익성 우수`,
        desc: `영업이익률 ${topProfitEntity.margin.toFixed(1)}%, ROE ${topProfitEntity.roe.toFixed(1)}%, 매출 ${Math.round(topProfitEntity.sales/100)}억원. 성공 모델로 다른 법인 벤치마킹`
      });
    }
    
    // 법인별 ROE 분석
    const entityROEAnalysis = entityProfitability
      .filter(e => e.equity > 0)
      .sort((a, b) => b.roe - a.roe);
    
    const topROEEntity = entityROEAnalysis.length > 0 ? entityROEAnalysis[0] : null;
    const lowROEEntity = entityROEAnalysis.find(e => e.roe < 10 && e.equity > 10000);
    
    if (topROEEntity && topROEEntity.roe > 15) {
      insights.push({
        title: `${topROEEntity.entity} ROE 우수`,
        desc: `ROE ${topROEEntity.roe.toFixed(1)}%, 자본 효율성 최고. 자본 배분 우선순위 검토`
      });
    }
    
    if (lowROEEntity && topROEEntity && topROEEntity.roe > lowROEEntity.roe + 5) {
      risks.push({
        title: `${lowROEEntity.entity} 자본 효율성 저하`,
        desc: `ROE ${lowROEEntity.roe.toFixed(1)}% (${topROEEntity.entity}: ${topROEEntity.roe.toFixed(1)}%). 자본 대비 수익 창출 능력 개선 필요`
      });
      actions.push({
        title: `${lowROEEntity.entity} ROE 제고`,
        desc: `수익성 개선 또는 자본 구조 최적화로 ROE ${(lowROEEntity.roe + 5).toFixed(1)}% 목표`
      });
    }
    
    // 저수익 법인
    if (lowProfitEntity && topProfitEntity) {
      risks.push({
        title: `${lowProfitEntity.entity} 수익성 저하`,
        desc: `영업이익률 ${lowProfitEntity.margin.toFixed(1)}%, ROE ${lowProfitEntity.roe.toFixed(1)}%, 매출 ${Math.round(lowProfitEntity.sales/100)}억원. ${topProfitEntity.entity}(${topProfitEntity.margin.toFixed(1)}%)와 ${Math.abs(lowProfitEntity.margin - topProfitEntity.margin).toFixed(1)}%p 격차`
      });
      actions.push({
        title: `${lowProfitEntity.entity} 수익성 개선`,
        desc: `${topProfitEntity.entity} 원가구조 벤치마킹, 비효율 비용 20% 절감, 고마진 제품 비중 확대`
      });
    }
    
    // 법인별 규모와 수익성 불균형
    const totalSales = entityProfitability.reduce((sum, e) => sum + e.sales, 0);
    const totalOpIncome = entityProfitability.reduce((sum, e) => sum + e.opIncome, 0);
    const entityImbalance = entityProfitability.map(e => ({
      ...e,
      salesShare: totalSales > 0 ? (e.sales / totalSales * 100) : 0,
      profitShare: totalOpIncome > 0 ? (e.opIncome / totalOpIncome * 100) : 0
    })).filter(e => e.salesShare > 15 && e.profitShare < e.salesShare * 0.7);
    
    if (entityImbalance.length > 0) {
      const target = entityImbalance[0];
      risks.push({
        title: `${target.entity} 수익 기여도 낮음`,
        desc: `매출 비중 ${target.salesShare.toFixed(0)}%지만 이익 기여 ${target.profitShare.toFixed(0)}%. 구조조정 또는 수익성 개선 시급`
      });
    }
    
    // 판관비 분석 (구체화)
    const highSGA = sgaBreakdown.filter(x => x.change > 15 && x.salesRatio > 10);
    if (highSGA.length > 0) {
      const top = highSGA[0];
      risks.push({
        title: `${top.item} 급증`,
        desc: `${Math.round(top.curr/100)}억원으로 전년대비 ${top.change.toFixed(1)}% 증가 (+${Math.round((top.curr-top.prev)/100)}억원), 매출대비 ${top.salesRatio.toFixed(1)}%`
      });
      actions.push({
        title: `${top.item} 최적화`,
        desc: `${top.item === '광고선전비' ? '디지털 마케팅 전환, ROI 2배 개선' : top.item === '인건비' ? '인당 생산성 20% 향상, 아웃소싱 확대' : '업무 프로세스 자동화'}`
      });
      
      const targetReduction = top.curr * 0.15; // 15% 절감 시
      let roeImpact = 0;
      if (totalEquityCurr > 0) {
        roeImpact = (targetReduction*0.73 / totalEquityCurr * 100);
        if (!isFinite(roeImpact) || isNaN(roeImpact)) roeImpact = 0;
      }
      
      improvementTargets.push({
        area: `${top.item} 구조 혁신`,
        current: `${Math.round(top.curr/100)}억원 (매출대비 ${top.salesRatio.toFixed(1)}%, 전년대비 +${top.change.toFixed(0)}%)`,
        target: `${Math.round(top.curr*0.85/100)}억원 (매출대비 ${(top.salesRatio*0.85).toFixed(1)}%)`,
        impact: `영업이익 +${Math.round(targetReduction/100)}억원 (+${(targetReduction/opIncomeCurr*100).toFixed(1)}%), 영업이익률 +${(targetReduction/salesCurr*100).toFixed(1)}%p, 당기순이익 +${Math.round(targetReduction*0.73/100)}억원, ROE +${roeImpact.toFixed(1)}%p`,
        method: top.item === '광고선전비' 
          ? `성과 기반 집행 체계 (매출 전환율 목표 달성 시 집행), 디지털 광고 비중 60%→80% 확대 (CPM 30% 절감), 대행사 수수료 재협상`
          : top.item === '인건비'
          ? `인당 매출액 목표 20% 상향, RPA·AI 도입으로 반복업무 자동화, 성과급 비중 확대 (고정급 억제), 비핵심 기능 아웃소싱`
          : top.item === '수수료'
          ? `물류·결제 수수료율 협상 (볼륨 기반 할인 확보), 직배송 비중 확대, 자체 풀필먼트 센터 구축 검토`
          : `비용 항목별 ROI 분석, 제로베이스 예산 도입, 비핵심 지출 30% 감축`
      });
    }
    
    // 현금 및 유동성 분석
    const cashRatio = totalAssetsCurr > 0 ? (cashCurr / totalAssetsCurr * 100) : 0;
    if (cashGrowth > 50) {
      insights.push({
        title: '유동성 대폭 개선',
        desc: `현금성자산 ${Math.round(cashCurr/100)}억원으로 ${cashGrowth.toFixed(0)}% 증가 (전년 +${Math.round((cashCurr-cashPrev)/100)}억원). 자산대비 ${cashRatio.toFixed(1)}%로 투자 여력 확보`
      });
      
      // 잉여현금이 많으면 활용 방안 제시
      if (cashCurr > totalAssetsCurr * 0.1) {
        actions.push({
          title: '잉여현금 전략적 활용',
          desc: `${Math.round(cashCurr*0.4/100)}억원을 M&A 또는 신규 브랜드에 투자 시 ROE ${totalEquityCurr > 0 ? (cashCurr*0.4*0.15/totalEquityCurr*100).toFixed(1) : '0.0'}%p 추가 개선 가능`
        });
        
        improvementTargets.push({
          area: '잉여현금 전략적 재배치',
          current: `현금성자산 ${Math.round(cashCurr/100)}억원 (자산대비 ${cashRatio.toFixed(1)}%)`,
          target: `적정 현금 ${Math.round(cashCurr*0.6/100)}억원 유지 + 전략투자 ${Math.round(cashCurr*0.4/100)}억원`,
          impact: `ROE 15% 투자처 발굴 시 연결 ROE +${totalEquityCurr > 0 ? (cashCurr*0.4*0.15/totalEquityCurr*100).toFixed(1) : '0.0'}%p, 주주가치 증대`,
          method: `옵션1: 고수익 브랜드 M&A (목표 ROE 18%+), 옵션2: 배당성향 30%→50% 확대 + 자사주 매입 ${Math.round(cashCurr*0.15/100)}억원, 옵션3: 해외 거점 확대 투자 (동남아, 중동)`
        });
      }
    } else if (cashCurr < totalAssetsCurr * 0.05) {
      risks.push({
        title: '유동성 부족',
        desc: `현금성자산 ${Math.round(cashCurr/100)}억원, 자산대비 ${cashRatio.toFixed(1)}%. 단기 자금 압박 리스크`
      });
      actions.push({
        title: '유동성 확보',
        desc: `재고 감축, 매출채권 팩토링, 단기 여신 한도 확보로 ${Math.round(totalAssetsCurr*0.08/100)}억원 확보`
      });
    }
    
    // 자산 효율성 분석
    const assetTurnover = totalAssetsCurr > 0 ? (salesCurr / totalAssetsCurr) : 0;
    const assetTurnoverPrev = totalAssetsPrev > 0 ? (salesPrev / totalAssetsPrev) : 0;
    if (assetTurnover < 0.5 && assetTurnover < assetTurnoverPrev) {
      risks.push({
        title: '자산 효율성 저하',
        desc: `총자산회전율 ${assetTurnover.toFixed(2)}회로 전년(${assetTurnoverPrev.toFixed(2)}회) 대비 하락. 자산 대비 매출 창출력 감소`
      });
      actions.push({
        title: '자산 효율 제고',
        desc: `저효율 자산 매각, 유휴 부동산 활용, 브랜드 가치 극대화로 회전율 ${(assetTurnover*1.2).toFixed(2)}회 목표`
      });
    } else if (assetTurnover > assetTurnoverPrev && assetTurnover > 0.6) {
      insights.push({
        title: '자산 효율성 우수',
        desc: `총자산회전율 ${assetTurnover.toFixed(2)}회로 개선. 효율적 자산 운용으로 수익성 극대화`
      });
    }
    
    // 재고 분석
    if (inventoryGrowth > 30) {
      risks.push({
        title: '재고자산 급증',
        desc: `${Math.round(inventoryCurr/100)}억원으로 ${inventoryGrowth.toFixed(0)}% 증가. 재고회전율 악화 및 평가손실 리스크`
      });
      actions.push({
        title: '재고 효율화',
        desc: `시즌 오프 프로모션 강화, 발주 최적화, VMI 도입으로 재고회전일수 30일 단축 목표`
      });
    }
    
    // 차입금 분석 (강화)
    if (totalBorrowing > 100000 && borrowingsByEntity.length > 0) {
      const topDebtor = borrowingsByEntity[0];
      risks.push({
        title: `${topDebtor.entity} 차입금 부담`,
        desc: `${Math.round(topDebtor.debt/100)}억원 (전체 ${(topDebtor.debt/totalBorrowing*100).toFixed(0)}%), 이자비용 연 ${Math.round(topDebtor.debt*0.045/100)}억원 추정, 환위험 노출`
      });
      actions.push({
        title: '차입금 감축',
        desc: `${topDebtor.entity} 영업현금 창출 강화, 운전자본 효율화로 연간 ${Math.round(topDebtor.debt*0.3/100)}억원 상환 목표`
      });
    }
    
    // 법인별 재무건전성 분석 (2025 4Q 데이터 반영)
    const entityFinancialHealth = ['OC(국내)', '중국', '홍콩', 'ST미국'].map(entity => {
      const assets = (entityBSData && entityBSData[entityBSPeriod] && entityBSData[entityBSPeriod].자산총계) 
        ? (entityBSData[entityBSPeriod].자산총계[entity] || 0) : 0;
      const debt = (entityBSData && entityBSData[entityBSPeriod] && entityBSData[entityBSPeriod].부채총계) 
        ? (entityBSData[entityBSPeriod].부채총계[entity] || 0) : 0;
      const equity = (entityBSData && entityBSData[entityBSPeriod] && entityBSData[entityBSPeriod].자본총계) 
        ? (entityBSData[entityBSPeriod].자본총계[entity] || 0) : 0;
      const retainedEarnings = (entityBSData && entityBSData[entityBSPeriod] && entityBSData[entityBSPeriod].이익잉여금) 
        ? (entityBSData[entityBSPeriod].이익잉여금[entity] || 0) : 0;
      const borrowings = (entityBSData && entityBSData[entityBSPeriod] && entityBSData[entityBSPeriod].차입금) 
        ? (entityBSData[entityBSPeriod].차입금[entity] || 0) : 0;
      const debtRatio = equity > 0 ? (debt / equity * 100) : 0;
      return { entity, assets, debt, equity, retainedEarnings, borrowings, debtRatio };
    });
    
    // ST미국 누적적자 분석
    const stUSData = entityFinancialHealth.find(e => e.entity === 'ST미국');
    if (stUSData && stUSData.retainedEarnings < 0) {
      risks.push({
        title: 'ST미국 누적적자 지속',
        desc: `이익잉여금 ${Math.round(stUSData.retainedEarnings/100)}억원 적자. 지속적인 손실로 자본잠식 리스크 모니터링 필요`
      });
      actions.push({
        title: 'ST미국 턴어라운드',
        desc: `사업구조 재검토, 비용 구조조정, 또는 전략적 철수 검토 필요`
      });
    }
    
    // 중국 부채비율 분석
    const chinaData = entityFinancialHealth.find(e => e.entity === '중국');
    if (chinaData && chinaData.debtRatio > 200) {
      risks.push({
        title: '중국 법인 부채비율 주의',
        desc: `부채비율 ${chinaData.debtRatio.toFixed(0)}%, 차입금 ${Math.round(chinaData.borrowings/100)}억원. 고성장 기반 레버리지이나 리스크 관리 필요`
      });
    }
    
    // 국내 법인 자본 효율성
    const domesticData = entityFinancialHealth.find(e => e.entity === 'OC(국내)');
    if (domesticData && domesticData.assets > 1500000) {
      const domesticROA = domesticData.assets > 0 ? ((entityProfitability.find(e => e.entity === 'OC(국내)')?.netIncome || 0) / domesticData.assets * 100) : 0;
      if (domesticROA > 8) {
        insights.push({
          title: '국내 법인 자산 효율성 우수',
          desc: `자산 ${Math.round(domesticData.assets/100)}억원, ROA ${domesticROA.toFixed(1)}%. 안정적 수익 기반 유지`
        });
      }
    }
    
    // 부채비율 분석
    if (debtRatioCurr > 100) {
      risks.push({
        title: '부채비율 위험',
        desc: `${debtRatioCurr.toFixed(1)}%로 자본 대비 부채 과다. 재무 안정성 악화 및 금융비용 부담 증가`
      });
      actions.push({
        title: '부채비율 개선',
        desc: `자기자본 확충 또는 부채 상환으로 부채비율 100% 이하 목표. 연간 ${Math.round(totalDebtCurr*0.2/100)}억원 상환 계획`
      });
    } else if (debtRatioCurr > 50 && debtRatioCurr <= 100) {
      risks.push({
        title: '부채비율 주의',
        desc: `${debtRatioCurr.toFixed(1)}%로 적정 수준이나 지속 모니터링 필요`
      });
    } else if (debtRatioCurr > 0 && debtRatioCurr <= 50) {
      insights.push({
        title: '부채비율 안정',
        desc: `${debtRatioCurr.toFixed(1)}%로 재무 안정성 양호. 적정 수준의 레버리지 활용`
      });
    }
    
    // ROE 분석
    if (roeChange < -3) {
      risks.push({
        title: 'ROE 하락',
        desc: `${roeCurr.toFixed(1)}%로 ${Math.abs(roeChange).toFixed(1)}%p 하락. 자본 효율성 저하`
      });
      actions.push({
        title: 'ROE 제고',
        desc: `순이익률 개선 + 자산회전율 향상으로 ROE 15% 달성. 저효율 자산 매각 검토`
      });
    } else if (roeCurr > 15) {
      insights.push({
        title: 'ROE 우수',
        desc: `${roeCurr.toFixed(1)}%로 자본 효율성 우수. 주주가치 창출 능력 강화`
      });
    } else if (roeCurr > 0 && roeCurr < 10) {
      risks.push({
        title: 'ROE 개선 필요',
        desc: `${roeCurr.toFixed(1)}%로 자본 대비 수익 창출 능력 저조. 수익성 및 자산 효율 개선 필요`
      });
    }
    
    // 운전자본 분석
    const wcSalesRatio = salesCurr > 0 ? (workingCapitalCurr / salesCurr * 100) : 0;
    if (wcSalesRatio > 50) {
      risks.push({
        title: '운전자본 과다',
        desc: `${Math.round(workingCapitalCurr/100)}억원, 매출대비 ${wcSalesRatio.toFixed(0)}%. 자금 효율 저하`
      });
      actions.push({
        title: '운전자본 최적화',
        desc: `매출채권 회수기간 단축, 재고 감축, 매입채무 조건 개선으로 ${Math.round(workingCapitalCurr*0.2/100)}억원 절감`
      });
    }
    
    // 매출 성장 인사이트
    if (salesGrowth < -10) {
      risks.push({
        title: '매출 역성장',
        desc: `전년대비 ${Math.abs(salesGrowth).toFixed(1)}% 감소. 시장 점유율 하락 및 수요 위축`
      });
      actions.push({
        title: '매출 회복',
        desc: `신규 채널 확대, 온라인 강화, 해외시장 공략으로 연간 ${Math.abs(salesGrowth/2).toFixed(0)}% 성장률 회복 목표`
      });
    } else if (salesGrowth > 15) {
      insights.push({
        title: '매출 고성장',
        desc: `전년대비 ${salesGrowth.toFixed(1)}% 증가. 시장 점유율 확대 및 브랜드 경쟁력 강화`
      });
    }
    
    // 연결 자산총계 성장 분석
    const assetGrowth = totalAssetsPrev > 0 ? ((totalAssetsCurr - totalAssetsPrev) / totalAssetsPrev * 100) : 0;
    if (assetGrowth > 15 && totalAssetsCurr > 2000000) {
      insights.push({
        title: '연결 자산 규모 확대',
        desc: `자산총계 ${(totalAssetsCurr/10000).toFixed(1)}조원 (전년대비 +${assetGrowth.toFixed(1)}%). 사업 규모 및 시장 지배력 강화`
      });
    } else if (assetGrowth < -5) {
      risks.push({
        title: '자산 규모 축소',
        desc: `자산총계 ${Math.round(totalAssetsCurr/100)}억원 (전년대비 ${assetGrowth.toFixed(1)}%). 사업 축소 또는 구조조정 진행 중`
      });
    }
    
    // 자본총계 성장 분석
    const equityGrowth = totalEquityPrev > 0 ? ((totalEquityCurr - totalEquityPrev) / totalEquityPrev * 100) : 0;
    if (equityGrowth > 10) {
      insights.push({
        title: '자기자본 확충',
        desc: `자본총계 ${(totalEquityCurr/10000).toFixed(2)}조원 (전년대비 +${equityGrowth.toFixed(1)}%). 이익 누적으로 재무 안정성 강화`
      });
    }
    
    // 법인별 성장 기여도 분석
    const entityAssetContribution = entityFinancialHealth
      .filter(e => e.assets > 0)
      .map(e => ({
        ...e,
        contribution: totalAssetsCurr > 0 ? (e.assets / totalAssetsCurr * 100) : 0
      }))
      .sort((a, b) => b.contribution - a.contribution);
    
    if (entityAssetContribution.length > 0) {
      const topAssetEntity = entityAssetContribution[0];
      if (topAssetEntity.contribution > 70) {
        insights.push({
          title: `${topAssetEntity.entity} 자산 집중도`,
          desc: `연결 자산의 ${topAssetEntity.contribution.toFixed(0)}% 차지 (${Math.round(topAssetEntity.assets/100)}억원). 핵심 수익 기반`
        });
      }
    }
    
    // 9) 연결관점 개선 타겟 분석
    // 수익성 개선 포텐셜이 큰 영역 파악
    
    // 타겟 1: 저수익 고매출 법인 수익성 개선
    const highSalesLowMargin = entityProfitability.filter(e => e.sales > 100000 && e.margin < 20);
    if (highSalesLowMargin.length > 0) {
      const target = highSalesLowMargin[0];
      const potentialIncrease = (target.sales * 0.05); // 영업이익률 5%p 개선 시
      let roeImpact = 0;
      if (totalEquityCurr > 0) {
        roeImpact = (potentialIncrease / totalEquityCurr * 100);
        if (!isFinite(roeImpact) || isNaN(roeImpact)) roeImpact = 0;
      }
      improvementTargets.push({
        area: `${target.entity} 수익성 집중 개선`,
        current: `영업이익률 ${target.margin.toFixed(1)}%, 매출 ${Math.round(target.sales/100)}억원`,
        target: `영업이익률 ${(target.margin + 5).toFixed(1)}% 달성`,
        impact: `연결 영업이익 +${Math.round(potentialIncrease/100)}억원 (+${(potentialIncrease/opIncomeCurr*100).toFixed(1)}%), 영업이익률 +${(potentialIncrease/salesCurr*100).toFixed(1)}%p, ROE +${roeImpact.toFixed(1)}%p`,
        method: `원가율 2%p 절감 (소싱 최적화, 로스율 감소), 판관비 매출대비 3%p 절감 (마케팅 ROI 개선, 인력 효율화), 고마진 제품 비중 20%→35% 확대`
      });
    }
    
    // 타겟 2: 매출총이익률이 낮은 경우 원가 개선
    if (grossMarginCurr < 60) {
      const targetGrossMargin = 65;
      const potentialIncrease = salesCurr * (targetGrossMargin - grossMarginCurr) / 100;
      const roeImpact = totalEquityCurr > 0 ? (potentialIncrease * 0.7 / totalEquityCurr * 100) : 0; // 세후 70%
      improvementTargets.push({
        area: '연결 매출총이익률 제고',
        current: `매출총이익률 ${grossMarginCurr.toFixed(1)}%`,
        target: `매출총이익률 ${targetGrossMargin}% 달성`,
        impact: `매출총이익 +${Math.round(potentialIncrease/100)}억원, 영업이익률 +${((potentialIncrease*0.8)/salesCurr*100).toFixed(1)}%p, ROE +${roeImpact.toFixed(1)}%p`,
        method: `중국 제조원가 5% 절감 (자동화 투자, 불량률 감소), 물류비 10% 절감 (직배송 확대), 고마진 라인 강화 (MLB, 디스커버리)`
      });
    }
    
    // 판관비 효율화 타겟
    const highSGAItem = sgaBreakdown.find(x => x.salesRatio > 12 && x.change > 5);
    if (highSGAItem) {
      const targetReduction = highSGAItem.curr * 0.15; // 15% 절감 시
      improvementTargets.push({
        area: `${highSGAItem.item} 효율화`,
        current: `매출대비 ${highSGAItem.salesRatio.toFixed(1)}%`,
        target: `매출대비 ${(highSGAItem.salesRatio * 0.85).toFixed(1)}%`,
        impact: `연결 영업이익 +${Math.round(targetReduction/100)}억원 (+${(targetReduction/opIncomeCurr*100).toFixed(1)}%)`,
        method: '지출 승인 프로세스 강화, 대행사 통합, 성과 기반 집행'
      });
    }
    
    // 재고 효율화 타겟
    if (inventoryGrowth > 20) {
      const targetReduction = inventoryCurr * 0.25; // 25% 감축 시
      const interestSaving = targetReduction * 0.05; // 연 5% 이자 절감
      improvementTargets.push({
        area: '재고자산 최적화',
        current: `${Math.round(inventoryCurr/100)}억원 (전년대비 +${inventoryGrowth.toFixed(0)}%)`,
        target: `${Math.round(inventoryCurr*0.75/100)}억원 (25% 감축)`,
        impact: `운전자본 ${Math.round(targetReduction/100)}억원 절감, 이자비용 -${Math.round(interestSaving/100)}억원, ROE +${totalEquityCurr > 0 ? (interestSaving/totalEquityCurr*100).toFixed(1) : '0.0'}%p`,
        method: '시즌별 재고 회전율 목표 관리, 프로모션 타이밍 최적화, 느린 상품 조기 할인'
      });
    }
    
    // 차입금 감축 타겟 (구체화)
    if (totalBorrowing > 100000 && borrowingsByEntity.length > 0) {
      const topDebtor = borrowingsByEntity[0];
      const targetReduction = totalBorrowing * 0.5; // 50% 감축 시
      const interestRate = 0.045; // 연 4.5% 가정
      const interestSaving = targetReduction * interestRate; // 연 이자 절감
      const netIncomIncrease = interestSaving * 0.73; // 세후 효과 (법인세율 27%)
      let roeImpact = 0;
      if (totalEquityCurr > 0) {
        roeImpact = (netIncomIncrease / totalEquityCurr * 100);
        if (!isFinite(roeImpact) || isNaN(roeImpact)) roeImpact = 0;
      }
      
      improvementTargets.push({
        area: '차입금 전략적 감축',
        current: `총 ${Math.round(totalBorrowing/100)}억원 (${topDebtor.entity} ${Math.round(topDebtor.debt/100)}억원, 부채비율 ${topDebtor.debtRatio.toFixed(0)}%)`,
        target: `${Math.round(totalBorrowing*0.5/100)}억원으로 감축 (${topDebtor.entity} 우선 상환)`,
        impact: `이자비용 -${Math.round(interestSaving/100)}억원/년, 당기순이익 +${Math.round(netIncomIncrease/100)}억원, 순이익률 +${(netIncomIncrease/salesCurr*100).toFixed(1)}%p, ROE +${roeImpact.toFixed(1)}%p, 부채비율 ${totalEquityCurr > 0 ? (debtRatioCurr - totalBorrowing*0.5/totalEquityCurr*100).toFixed(0) : debtRatioCurr.toFixed(0)}%로 개선`,
        method: `${topDebtor.entity} 재고 감축으로 현금 ${Math.round(topDebtor.debt*0.3/100)}억원 확보 + 영업이익 개선 + 본사 여유자금 ${Math.round(cashCurr*0.3/100)}억원 지원 + 저효율 자산 매각`
      });
    }
    
    // 운전자본 효율화 (구체화)
    const wcTurnover = (salesCurr > 0 && workingCapitalCurr > 0) ? (salesCurr / workingCapitalCurr) : 0;
    if (wcTurnover > 0 && wcTurnover < 3 && workingCapitalCurr > 100000) {
      const targetWC = workingCapitalCurr * 0.7; // 30% 개선 시
      const freedCash = workingCapitalCurr - targetWC;
      const interestSaving = freedCash * 0.04; // 연 4% 절감 효과
      let roeImpact = 0;
      if (totalEquityCurr > 0) {
        roeImpact = (interestSaving*0.73 / totalEquityCurr * 100);
        if (!isFinite(roeImpact) || isNaN(roeImpact)) roeImpact = 0;
      }
      
      const arDaysStr = (arDays > 0 && arDays < 1000) ? `${Math.round(arDays)}→${Math.round(arDays*0.8)}일` : '단축';
      const inventoryDaysStr = (inventoryDays > 0 && inventoryDays < 1000) ? `${Math.round(inventoryDays)}→${Math.round(inventoryDays*0.75)}일` : '단축';
      const apDaysStr = (apDays > 0 && apDays < 1000) ? `${Math.round(apDays)}→${Math.round(apDays*1.1)}일` : '개선';
      const cccStr = (cashConversionCycle > 0 && cashConversionCycle < 1000) ? `${Math.round(cashConversionCycle)}일` : '-';
      const targetCccStr = (cashConversionCycle > 0 && cashConversionCycle < 1000) ? `${Math.round(cashConversionCycle*0.7)}일` : '개선';
      
      improvementTargets.push({
        area: '운전자본 순환 효율화',
        current: `${Math.round(workingCapitalCurr/100)}억원 (회전율 ${wcTurnover.toFixed(1)}회, CCC ${cccStr})`,
        target: `${Math.round(targetWC/100)}억원 (회전율 ${(wcTurnover*1.43).toFixed(1)}회, CCC ${targetCccStr})`,
        impact: `현금 ${Math.round(freedCash/100)}억원 확보, 금융비용 -${Math.round(interestSaving/100)}억원/년, 유동비율 개선, ROE +${roeImpact.toFixed(1)}%p`,
        method: `매출채권: 회수기간 ${arDaysStr} (조기결제 할인, 신용관리), 재고: 회전일수 ${inventoryDaysStr} (재고 KPI 강화), 매입채무: ${apDaysStr} (지급조건 협상)`
      });
    }
    
    // 타겟 3: 법인별 불균형 해소
    if (entityImbalance.length > 0 && entityProfitability.length > 0) {
      const target = entityImbalance[0];
      const profitGap = target.salesShare - target.profitShare;
      const potentialIncrease = opIncomeCurr * (profitGap / 100);
      const targetMargin = totalOpIncome > 0 ? (totalOpIncome / totalSales * 100) : 0;
      
      improvementTargets.push({
        area: `${target.entity} 수익구조 정상화`,
        current: `매출비중 ${target.salesShare.toFixed(0)}% vs 이익비중 ${target.profitShare.toFixed(0)}% (${profitGap.toFixed(0)}%p 괴리)`,
        target: `이익 기여도를 매출 비중 수준으로 개선 (영업이익률 ${target.margin.toFixed(1)}%→${targetMargin.toFixed(1)}%)`,
        impact: `연결 영업이익 +${Math.round(potentialIncrease/100)}억원, 영업이익률 +${(potentialIncrease/salesCurr*100).toFixed(1)}%p, ROE +${totalEquityCurr > 0 ? (potentialIncrease*0.73/totalEquityCurr*100).toFixed(1) : '0.0'}%p`,
        method: `저마진 제품 단종/가격 인상, 고마진 법인(${entityProfitability[0].entity})의 운영 노하우 이전, 고정비 구조조정, 브랜드 포트폴리오 재편`
      });
    }
    
    // 우선순위 정렬 (영향도 큰 순)
    return {
      keyMetrics: {
        opMargin: { curr: opMarginCurr, prev: opMarginPrev, change: opMarginChange },
        netMargin: { curr: netMarginCurr, prev: netMarginPrev, change: netMarginChange },
        debtRatio: { curr: debtRatioCurr, prev: debtRatioPrev, status: debtRatioCurr < 100 ? '안정' : '주의' },
        roe: { curr: roeCurr, prev: roePrev, change: roeChange }
      },
      insights: insights.slice(0, 3),
      risks: risks.slice(0, 3),
      actions: actions.slice(0, 3),
      improvementTargets: improvementTargets.slice(0, 4) // 상위 4개 개선 타겟
    };
  };

  // ============================================
  // 전체요약 탭 렌더링
  // ============================================
  const renderSummaryTab = () => {
    // 손익 요약 카드 데이터 (억원 단위, 선택된 분기까지 누적 기준)
    const selectedYearKey = getPeriodKey(selectedPeriod, 'year');
    const prevYearKey = getPeriodKey(selectedPeriod, 'prev_year') || '2024_Year';
    
    // 매출액 (비율 계산용)
    const salesCurr = incomeStatementData[selectedYearKey]?.매출액 || 0;
    const salesPrev = incomeStatementData[prevYearKey]?.매출액 || 0;
    
    // 매출총이익 및 매출총이익률
    const grossProfitCurr = incomeStatementData[selectedYearKey]?.매출총이익 || 0;
    const grossProfitPrev = incomeStatementData[prevYearKey]?.매출총이익 || 0;
    const grossMarginCurr = salesCurr !== 0 ? (grossProfitCurr / salesCurr * 100) : 0;
    const grossMarginPrev = salesPrev !== 0 ? (grossProfitPrev / salesPrev * 100) : 0;
    
    // 영업이익 및 영업이익률
    const operatingIncomeCurr = incomeStatementData[selectedYearKey]?.영업이익 || 0;
    const operatingIncomePrev = incomeStatementData[prevYearKey]?.영업이익 || 0;
    const operatingMarginCurr = salesCurr !== 0 ? (operatingIncomeCurr / salesCurr * 100) : 0;
    const operatingMarginPrev = salesPrev !== 0 ? (operatingIncomePrev / salesPrev * 100) : 0;
    
    // 당기순이익 및 당기순이익률
    const netIncomeCurr = incomeStatementData[selectedYearKey]?.당기순이익 || 0;
    const netIncomePrev = incomeStatementData[prevYearKey]?.당기순이익 || 0;
    const netMarginCurr = salesCurr !== 0 ? (netIncomeCurr / salesCurr * 100) : 0;
    const netMarginPrev = salesPrev !== 0 ? (netIncomePrev / salesPrev * 100) : 0;
    
    const incomeCards = [
      { 
        title: '매출액', 
        value: Math.round(salesCurr / 100), 
        prevValue: Math.round(salesPrev / 100), 
        iconColor: 'bg-blue-500',
        hasRate: false
      },
      { 
        title: '매출총이익', 
        value: Math.round(grossProfitCurr / 100), 
        prevValue: Math.round(grossProfitPrev / 100), 
        iconColor: 'bg-blue-500',
        hasRate: true,
        rateLabel: '매출총이익률',
        rateCurr: grossMarginCurr,
        ratePrev: grossMarginPrev
      },
      { 
        title: '영업이익', 
        value: Math.round(operatingIncomeCurr / 100), 
        prevValue: Math.round(operatingIncomePrev / 100), 
        iconColor: 'bg-emerald-500',
        hasRate: true,
        rateLabel: '영업이익률',
        rateCurr: operatingMarginCurr,
        ratePrev: operatingMarginPrev
      },
      { 
        title: '당기순이익', 
        value: Math.round(netIncomeCurr / 100), 
        prevValue: Math.round(netIncomePrev / 100), 
        iconColor: 'bg-violet-500',
        hasRate: true,
        rateLabel: '당기순이익률',
        rateCurr: netMarginCurr,
        ratePrev: netMarginPrev
      },
    ];

    // 재무상태 요약 카드 데이터 (억원 단위, 선택된 분기 기말 기준)
    const balanceCards = [
      { title: '자산총계', value: Math.round((balanceSheetData[bsCurrentPeriod]?.자산총계 || 0) / 100), prevValue: Math.round((balanceSheetData[bsPrevPeriod]?.자산총계 || 0) / 100), iconColor: 'bg-amber-500', hasRate: false },
      { title: '부채총계', value: Math.round((balanceSheetData[bsCurrentPeriod]?.부채총계 || 0) / 100), prevValue: Math.round((balanceSheetData[bsPrevPeriod]?.부채총계 || 0) / 100), iconColor: 'bg-rose-500', hasRate: false },
      { title: '자본총계', value: Math.round((balanceSheetData[bsCurrentPeriod]?.자본총계 || 0) / 100), prevValue: Math.round((balanceSheetData[bsPrevPeriod]?.자본총계 || 0) / 100), iconColor: 'bg-cyan-500', hasRate: false },
    ];

    // 조단위 포맷 함수 (억원 단위 입력) - 숫자와 단위 분리 반환
    const formatTrilBilSummary = (valueInBil) => {
      if (valueInBil === 0 || valueInBil === undefined || valueInBil === null) return { number: '-', unit: '' };
      const absValue = Math.abs(valueInBil);
      const sign = valueInBil < 0 ? '-' : '';
      
      if (absValue >= 10000) {
        const tril = Math.floor(absValue / 10000);
        const bil = Math.round(absValue % 10000);
        return { number: `${sign}${tril}조 ${formatNumber(bil)}`, unit: '억원' };
      }
      return { number: `${sign}${formatNumber(Math.round(absValue))}`, unit: '억원' };
    };

    // 카드 렌더링 함수
    const renderCard = (card, idx) => {
      const change = card.prevValue !== 0 
        ? ((card.value - card.prevValue) / Math.abs(card.prevValue) * 100).toFixed(1) 
        : 0;
      const isPositive = parseFloat(change) >= 0;
      const formatted = formatTrilBilSummary(card.value);
      const formattedPrev = formatTrilBilSummary(card.prevValue);
      const diff = card.value - card.prevValue;
      const formattedDiff = formatTrilBilSummary(diff);
      
      // 비율 증감 계산
      let rateDiff = null;
      if (card.hasRate && card.rateCurr !== undefined && card.ratePrev !== undefined) {
        rateDiff = (card.rateCurr - card.ratePrev).toFixed(1);
      }
      
      return (
        <div key={idx} className="bg-white rounded-lg border border-zinc-200 shadow-sm p-4 hover:shadow-md transition-shadow duration-200">
          {/* 헤더: 제목과 증감률 박스 */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-zinc-500 uppercase tracking-wide">{card.title}</span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
              isPositive ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
            }`}>
              {change != 0 ? `${isPositive ? '+' : ''}${change}%` : '-'}
            </span>
          </div>
          
          {/* 당년 수치 */}
          <div className="flex items-baseline gap-1 mb-3">
            <span className="text-2xl font-bold text-zinc-900">{formatted.number}</span>
            <span className="text-sm font-normal text-zinc-400">{formatted.unit}</span>
          </div>
          
          {/* 전년 수치 및 차액 (한 줄) */}
          <div className="text-xs text-zinc-600 mb-3">
            전년 {formattedPrev.number.replace('억원', '억')}억원
            {diff !== 0 && (
              <span className={`ml-1 font-medium ${diff >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {diff >= 0 ? '+' : ''}{formattedDiff.number.replace('억원', '억')}억원
              </span>
            )}
          </div>
          
          {/* 비율 (영업이익률, 당기순이익률) */}
          {card.hasRate && card.rateCurr !== undefined && (
            <div className="pt-3 border-t border-zinc-100">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-400">{card.rateLabel}</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-zinc-900 font-semibold">{card.rateCurr.toFixed(1)}%</span>
                  {rateDiff !== null && parseFloat(rateDiff) !== 0 && (
                    <span className={`text-xs font-medium ${parseFloat(rateDiff) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {parseFloat(rateDiff) >= 0 ? '+' : ''}{rateDiff}%p
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      );
    };

    return (
      <div className="space-y-4">
        {/* 손익 요약 섹션 */}
        <div>
          <h3 className="text-sm font-semibold text-zinc-700 mb-2 flex items-center gap-2">
            <span className="w-1 h-4 bg-blue-500 rounded"></span>
            손익 요약
          </h3>
          <div className="grid grid-cols-4 gap-3">
            {incomeCards.map((card, idx) => renderCard(card, idx))}
          </div>
        </div>

        {/* 재무상태 요약 섹션 */}
        <div>
          <h3 className="text-sm font-semibold text-zinc-700 mb-2 flex items-center gap-2">
            <span className="w-1 h-4 bg-amber-500 rounded"></span>
            재무상태 요약
          </h3>
          <div className="grid grid-cols-3 gap-3">
            {balanceCards.map((card, idx) => renderCard(card, idx))}
          </div>
        </div>

        {/* AI 분석 섹션 */}
        <div>
          <h3 className="text-sm font-semibold text-zinc-700 mb-2 flex items-center gap-2">
            <span className="w-1 h-4 bg-gradient-to-b from-blue-500 to-violet-500 rounded"></span>
            AI 분석
          </h3>
          <div className="bg-gradient-to-br from-zinc-900 to-zinc-800 rounded-lg p-5 text-white shadow-lg">
            {(() => {
              try {
                const analysis = generateAIAnalysis();
                if (!analysis || !analysis.keyMetrics) {
                  return <div className="text-xs text-zinc-400">데이터를 불러오는 중...</div>;
                }
                const { keyMetrics, insights = [], risks = [], actions = [], improvementTargets = [] } = analysis;
              
              return (
                <>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center shadow-md">
                      <span className="text-white text-xs font-bold">AI</span>
                    </div>
                    <div>
                      <div className="text-sm font-semibold">F&F {selectedPeriod ? selectedPeriod.split('_')[0] : '2025'}년 재무 종합 분석</div>
                      <div className="text-xs text-zinc-400">수익성 · 안정성 · 리스크 · 액션플랜</div>
                    </div>
                  </div>
                  
                  {/* 핵심 지표 요약 (동적) */}
                  <div className="grid grid-cols-4 gap-2 mb-4 p-3 bg-white/5 rounded-lg border border-white/10">
                    <div className="text-center">
                      <div className="text-[10px] text-zinc-400 mb-0.5">영업이익률</div>
                      <div className={`text-sm font-bold ${keyMetrics.opMargin.change >= 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {keyMetrics.opMargin.curr.toFixed(1)}%
                      </div>
                      <div className={`text-[10px] ${keyMetrics.opMargin.change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {keyMetrics.opMargin.change >= 0 ? '+' : ''}{keyMetrics.opMargin.change.toFixed(1)}%p
                      </div>
                    </div>
                    <div className="text-center border-l border-white/10">
                      <div className="text-[10px] text-zinc-400 mb-0.5">순이익률</div>
                      <div className={`text-sm font-bold ${keyMetrics.netMargin.change >= 0 ? 'text-emerald-400' : 'text-blue-400'}`}>
                        {keyMetrics.netMargin.curr.toFixed(1)}%
                      </div>
                      <div className={`text-[10px] ${keyMetrics.netMargin.change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {keyMetrics.netMargin.change >= 0 ? '+' : ''}{keyMetrics.netMargin.change.toFixed(1)}%p
                      </div>
                    </div>
                    <div className="text-center border-l border-white/10">
                      <div className="text-[10px] text-zinc-400 mb-0.5">부채비율</div>
                      <div className={`text-sm font-bold ${keyMetrics.debtRatio.curr < 100 ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {keyMetrics.debtRatio.curr.toFixed(1)}%
                      </div>
                      <div className="text-[10px] text-emerald-400">{keyMetrics.debtRatio.status}</div>
                    </div>
                    <div className="text-center border-l border-white/10">
                      <div className="text-[10px] text-zinc-400 mb-0.5">ROE</div>
                      <div className={`text-sm font-bold ${keyMetrics.roe.change >= 0 ? 'text-emerald-400' : 'text-violet-400'}`}>
                        {keyMetrics.roe.curr.toFixed(1)}%
                      </div>
                      <div className={`text-[10px] ${keyMetrics.roe.change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {keyMetrics.roe.change >= 0 ? '+' : ''}{keyMetrics.roe.change.toFixed(1)}%p
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-4">
                    {/* 주요 인사이트 (동적) */}
                    <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                        <span className="text-xs font-semibold text-emerald-400">주요 인사이트</span>
                      </div>
                      {insights.length > 0 ? (
                        <ul className="text-xs text-zinc-300 space-y-1.5">
                          {insights.map((insight, idx) => (
                            <li key={idx} className="flex items-start gap-1.5">
                              <span className="text-emerald-400 mt-0.5">•</span>
                              <span><strong className="text-white">{insight.title}:</strong> {insight.desc}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs text-zinc-400 italic">긍정적 인사이트를 발견하지 못했습니다.</p>
                      )}
                    </div>

                    {/* 리스크 분석 (동적) */}
                    <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="w-2 h-2 rounded-full bg-rose-400"></span>
                        <span className="text-xs font-semibold text-rose-400">리스크 분석</span>
                      </div>
                      {risks.length > 0 ? (
                        <ul className="text-xs text-zinc-300 space-y-1.5">
                          {risks.map((risk, idx) => (
                            <li key={idx} className="flex items-start gap-1.5">
                              <span className="text-rose-400 mt-0.5">⚠</span>
                              <span><strong className="text-white">{risk.title}:</strong> {risk.desc}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs text-zinc-400 italic">주요 리스크가 발견되지 않았습니다.</p>
                      )}
                    </div>
                  </div>

                  {/* 액션 플랜 (동적) */}
                  <div className="p-3 bg-gradient-to-r from-blue-500/20 to-violet-500/20 rounded-lg border border-blue-400/30 mb-3">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-2 h-2 rounded-full bg-violet-400"></span>
                      <span className="text-sm font-semibold text-violet-400">전략적 액션 플랜</span>
                    </div>
                    {actions.length > 0 ? (
                      <div className="grid grid-cols-3 gap-3">
                        {actions.map((action, idx) => (
                          <div key={idx} className="p-2 bg-white/5 rounded">
                            <div className="flex items-center gap-1.5 mb-1">
                              <span className="text-blue-400 text-base">
                                {idx === 0 ? '🎯' : idx === 1 ? '⚡' : '💡'}
                              </span>
                              <span className="text-sm font-semibold text-blue-400">{action.title}</span>
                            </div>
                            <p className="text-xs text-zinc-300 leading-relaxed">
                              {action.desc}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-zinc-400 italic">전략적 액션이 필요하지 않습니다.</p>
                    )}
                  </div>

                  {/* 연결관점 개선 타겟 (신규) */}
                  {improvementTargets && improvementTargets.length > 0 && (
                    <div className="p-4 bg-gradient-to-br from-violet-500/10 to-blue-500/10 rounded-lg border border-violet-400/20">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="w-2 h-2 rounded-full bg-violet-400"></span>
                        <span className="text-sm font-semibold text-violet-400">연결관점 수익성·안정성 개선 타겟</span>
                        <span className="text-xs text-zinc-400 ml-auto">우선순위 순</span>
                      </div>
                      <div className="space-y-2.5">
                        {improvementTargets.map((target, idx) => (
                          <div key={idx} className="p-3 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-all">
                            <div className="flex items-start gap-2 mb-2">
                              <div className="flex-shrink-0 w-6 h-6 rounded bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center text-white text-xs font-bold">
                                {idx + 1}
                              </div>
                              <div className="flex-1">
                                <div className="text-sm font-semibold text-white mb-1">{target.area}</div>
                                <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                                  <div className="p-1.5 bg-white/5 rounded">
                                    <span className="text-zinc-400">현재: </span>
                                    <span className="text-zinc-200">{target.current}</span>
                                  </div>
                                  <div className="p-1.5 bg-white/5 rounded">
                                    <span className="text-zinc-400">목표: </span>
                                    <span className="text-emerald-400 font-semibold">{target.target}</span>
                                  </div>
                                </div>
                                <div className="p-2 bg-gradient-to-r from-emerald-500/10 to-blue-500/10 rounded border border-emerald-400/20 mb-1.5">
                                  <div className="text-xs text-emerald-400 font-semibold mb-0.5">📊 예상 효과</div>
                                  <div className="text-xs text-zinc-200">{target.impact}</div>
                                </div>
                                <div className="p-2 bg-white/5 rounded">
                                  <div className="text-xs text-blue-400 font-semibold mb-0.5">🔧 실행 방안</div>
                                  <div className="text-xs text-zinc-300 leading-relaxed">{target.method}</div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {/* 종합 개선 효과 */}
                      {improvementTargets.length > 1 && (() => {
                        // 전체 개선 효과 계산
                        const totalOpIncomeIncrease = improvementTargets.reduce((sum, t) => {
                          const match = t.impact.match(/영업이익 \+(\d+)억원/);
                          return sum + (match ? parseInt(match[1]) : 0);
                        }, 0);
                        const totalRoeIncrease = improvementTargets.reduce((sum, t) => {
                          const match = t.impact.match(/ROE \+(\d+\.?\d*)%p/);
                          return sum + (match ? parseFloat(match[1]) : 0);
                        }, 0);
                        const currentOpMargin = keyMetrics.opMargin.curr;
                        const currentRoe = keyMetrics.roe.curr;
                        const targetOpMargin = currentOpMargin + (totalOpIncomeIncrease * 100 / (incomeStatementData[getPeriodKey(selectedPeriod, 'year')]?.매출액 || 1));
                        const targetRoe = currentRoe + totalRoeIncrease;
                        
                        return (
                          <div className="mt-3 p-3 bg-gradient-to-r from-emerald-500/20 to-blue-500/20 rounded-lg border border-emerald-400/30">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-emerald-400 text-base">✨</span>
                              <span className="text-sm font-semibold text-emerald-400">전체 실행 시 예상 효과</span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 mb-2">
                              <div className="p-2 bg-white/5 rounded">
                                <div className="text-xs text-zinc-400 mb-0.5">영업이익 증가</div>
                                <div className="text-sm font-bold text-emerald-400">+{totalOpIncomeIncrease}억원</div>
                                <div className="text-xs text-zinc-300">
                                  {currentOpMargin.toFixed(1)}% → {targetOpMargin.toFixed(1)}% (+{(targetOpMargin - currentOpMargin).toFixed(1)}%p)
                                </div>
                              </div>
                              <div className="p-2 bg-white/5 rounded">
                                <div className="text-xs text-zinc-400 mb-0.5">ROE 개선</div>
                                <div className="text-sm font-bold text-blue-400">+{totalRoeIncrease.toFixed(1)}%p</div>
                                <div className="text-xs text-zinc-300">
                                  {currentRoe.toFixed(1)}% → {targetRoe.toFixed(1)}%
                                </div>
                              </div>
                            </div>
                            <div className="text-xs text-zinc-200 leading-relaxed">
                              {improvementTargets.length}개 타겟 순차 실행으로 {selectedPeriod && selectedPeriod.split('_')[0] === '2025' ? '2026' : (selectedPeriod ? (Number(selectedPeriod.split('_')[0]) + 1) : '내년')}년 
                              업계 최고 수준의 재무구조 달성 가능. 
                              우선순위: ① 재고 효율화 (즉시 효과) → ② 수익성 개선 (6개월) → ③ 차입금 감축 (12개월)
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between">
                    <span className="text-[10px] text-zinc-500">AI 분석은 참고용이며 투자 조언이 아닙니다</span>
                    <span className="text-[10px] text-zinc-500">{selectedPeriod ? `${selectedPeriod.split('_')[0]}년 ${selectedPeriod.split('_')[1]} 기준` : '데이터 기준'}</span>
                  </div>
                </>
              );
              } catch (error) {
                console.error('AI 분석 오류:', error);
                return (
                  <div className="p-4 text-center">
                    <div className="text-sm text-rose-400 mb-2">⚠️ 분석 중 오류가 발생했습니다</div>
                    <div className="text-xs text-zinc-400">{error.message || '알 수 없는 오류'}</div>
                  </div>
                );
              }
            })()}
          </div>
        </div>
      </div>
    );
  };

  // ============================================
  // 손익계산서 탭 렌더링
  // ============================================
  const renderIncomeTab = () => {
    // 비율 계산 함수
    const calcRate = (numerator, denominator) => {
      if (!denominator || denominator === 0) return '-';
      return ((numerator / denominator) * 100).toFixed(1) + '%';
    };

    // 증감률 계산 (percentage point 용)
    const calcRateDiff = (current, prev) => {
      if (current === '-' || prev === '-') return '-';
      const currNum = parseFloat(current);
      const prevNum = parseFloat(prev);
      if (isNaN(currNum) || isNaN(prevNum)) return '-';
      const diff = currNum - prevNum;
      return (diff >= 0 ? '+' : '') + diff.toFixed(1) + '%p';
    };

    // 법인별 데이터는 컴포넌트 상위 레벨에서 정의됨 (entityData)
    // 아래 중복 정의는 제거됨 - 상위 레벨의 entityData 사용
    
    // 현재 모드에 따른 기간 설정 (선택된 기간 기준)
    const getCurrentPeriodKey = () => {
      if (incomeViewMode === 'quarter') {
        return getPeriodKey(selectedPeriod, 'quarter');
      } else {
        // 누적: 선택된 분기까지의 누적
        return getPeriodKey(selectedPeriod, 'year');
      }
    };

    const getPrevPeriodKey = () => {
      if (incomeViewMode === 'quarter') {
        // 분기: 전년 동 분기
        return getPeriodKey(selectedPeriod, 'prev_quarter');
      } else {
        // 누적: 전년 동기 누적
        return getPeriodKey(selectedPeriod, 'prev_year');
      }
    };

    const currPeriod = getCurrentPeriodKey();
    const prevPeriod = getPrevPeriodKey();
    const periodLabel = incomeViewMode === 'quarter' 
      ? selectedPeriod.replace('2025_', '').replace('Q', '') + '분기'
      : '연간';

    // 법인 색상
    const entityColors = {
      'OC(국내)': '#3B82F6',
      '중국': '#F59E0B',
      '홍콩': '#8B5CF6',
      'ST미국': '#10B981',
      '기타': '#6B7280',
      '연결조정': '#9CA3AF',
    };

    // ============================================
    // 법인별 분석 데이터 정합성 보정
    // - 현재 entityData는 "연결조정 전 합산" 기준이며, 일부 기간(4Q/연간)이 동일 값으로 들어가 있음
    // - UI 표(연결) 합계와 맞추기 위해, 선택 과목/기간의 연결 금액을 기준으로
    //   1) 기준 분해(연간 분해값)를 스케일링하고
    //   2) 반올림 오차/연결조정 차이는 '연결조정' 라인으로 보정
    // ============================================
    const getConsolidatedTotal = (accountKey, period) => {
      const v = incomeStatementData?.[period]?.[accountKey];
      return typeof v === 'number' ? v : 0;
    };

    const getBaseEntityBreakdown = (accountKey, period) => {
      // 우선 해당 period 값이 있으면 사용, 없으면 같은 연도의 Year 값을 기준(특히 4Q)으로 사용
      const direct = entityData?.[accountKey]?.[period];
      if (direct && Object.keys(direct).length > 0) return direct;

      const fallbackPeriod = period.endsWith('_4Q') ? period.replace('_4Q', '_Year') : period;
      return entityData?.[accountKey]?.[fallbackPeriod] || {};
    };

    const getAlignedEntityBreakdown = (accountKey, period) => {
      const consolidatedTotal = getConsolidatedTotal(accountKey, period);
      const base = getBaseEntityBreakdown(accountKey, period);

      const baseKeys = Object.keys(base);
      if (baseKeys.length === 0) {
        return { '연결조정': consolidatedTotal };
      }

      const baseSum = baseKeys.reduce((sum, k) => sum + (base[k] || 0), 0);
      if (baseSum === 0) {
        return { ...base, '연결조정': consolidatedTotal };
      }

      const scale = consolidatedTotal / baseSum;
      const scaled = {};
      for (const k of baseKeys) {
        // 반올림으로 발생하는 차이는 연결조정으로 흡수
        scaled[k] = Math.round((base[k] || 0) * scale);
      }

      const scaledSum = Object.values(scaled).reduce((sum, v) => sum + (v || 0), 0);
      const adjustment = consolidatedTotal - scaledSum;
      return { ...scaled, '연결조정': adjustment };
    };

    // 표시용 그룹핑: 비중이 작은 법인 + 연결조정을 '기타(연결조정)'로 합산
    const MINOR_ENTITY_RATIO_THRESHOLD = 0.03; // 3% 미만은 기타로 합산
    const MERGED_ENTITY_LABEL = '기타(연결조정)';
    const MAJOR_ENTITIES = ['OC(국내)', '중국'];

    // 단일 기간용 (도넛 차트 등)
    const getGroupedEntityBreakdown = (accountKey, period) => {
      return getGroupedEntityBreakdownForComparison(accountKey, period, period);
    };

    // 비교용: 전기/당기 둘 다를 고려하여, 한 기간이라도 유의미하면 개별로 유지
    const getGroupedEntityBreakdownForComparison = (accountKey, prevPeriod, currPeriod) => {
      const totalCurr = getConsolidatedTotal(accountKey, currPeriod);
      const totalPrev = getConsolidatedTotal(accountKey, prevPeriod);
      const alignedCurr = getAlignedEntityBreakdown(accountKey, currPeriod);
      const alignedPrev = getAlignedEntityBreakdown(accountKey, prevPeriod);

      // 전기/당기 모두의 키를 합집합으로 수집
      const allKeys = Array.from(new Set([...Object.keys(alignedPrev), ...Object.keys(alignedCurr)]));

      const merged = {};
      const entitiesToKeep = new Set();

      // 1. OC(국내), 중국은 항상 유지
      MAJOR_ENTITIES.forEach(entity => {
        if (allKeys.includes(entity)) {
          entitiesToKeep.add(entity);
        }
      });

      // 2. 전기나 당기 중 하나라도 데이터가 있고, 그 기간의 비중이 3% 이상이면 개별로 유지
      for (const name of allKeys) {
        if (MAJOR_ENTITIES.includes(name) || name === '연결조정' || name === '기타') continue;

        const prevVal = alignedPrev[name] || 0;
        const currVal = alignedCurr[name] || 0;
        
        const prevRatio = totalPrev !== 0 ? Math.abs(prevVal) / Math.abs(totalPrev) : 0;
        const currRatio = totalCurr !== 0 ? Math.abs(currVal) / Math.abs(totalCurr) : 0;

        // 전기나 당기 중 하나라도 데이터가 있고, 그 기간의 비중이 3% 이상이면 개별 유지
        const hasDataInEitherPeriod = prevVal !== 0 || currVal !== 0;
        const isSignificantInEitherPeriod = prevRatio >= MINOR_ENTITY_RATIO_THRESHOLD || currRatio >= MINOR_ENTITY_RATIO_THRESHOLD;

        if (hasDataInEitherPeriod && isSignificantInEitherPeriod) {
          entitiesToKeep.add(name);
        }
      }

      // 3. 유지할 법인들을 merged에 추가 (당기 값을 사용)
      entitiesToKeep.forEach(name => {
        merged[name] = alignedCurr[name] || 0;
      });

      // 4. 나머지는 기타(연결조정)로 흡수 (합계 정합성 보장)
      const keptSum = Object.values(merged).reduce((s, v) => s + (v || 0), 0);
      merged[MERGED_ENTITY_LABEL] = totalCurr - keptSum;

      return merged;
    };

    // 도넛 차트용 데이터 변환 (양수 값만 표시)
    const getDonutData = (period) => {
      const data = getGroupedEntityBreakdown(selectedAccount, period);
      return Object.entries(data)
        .filter(([_, value]) => value > 0) // 양수만 필터링 (도넛은 음수 표현이 어려움)
        .map(([name, value]) => ({
          name,
          value: value || 0,
          color:
            name === MERGED_ENTITY_LABEL
              ? '#6B7280'
              : (entityColors[name] || '#9CA3AF'),
        }));
    };

    // 법인별 테이블 데이터 - 현재 모드에 따라 연동
    const getEntityTableData = () => {
      // 비교용 함수 사용: 전기/당기 둘 다를 고려
      const curr = getGroupedEntityBreakdownForComparison(selectedAccount, prevPeriod, currPeriod);
      const prev = getGroupedEntityBreakdownForComparison(selectedAccount, prevPeriod, prevPeriod);
      const totalCurr = getConsolidatedTotal(selectedAccount, currPeriod);
      
      // 표 표시 순서:
      // - OC/중국은 항상 상단
      // - 그 외(예: 홍콩)가 임계치 이상이면 개별로 남을 수 있으므로 동적으로 포함
      // - 기타(연결조정)는 항상 마지막
      const keyUnion = Array.from(
        new Set([...Object.keys(prev), ...Object.keys(curr)])
      );

      const dynamicEntities = keyUnion
        .filter((k) => k !== MERGED_ENTITY_LABEL && !MAJOR_ENTITIES.includes(k))
        .sort(
          (a, b) =>
            Math.max(Math.abs(curr[b] || 0), Math.abs(prev[b] || 0)) -
            Math.max(Math.abs(curr[a] || 0), Math.abs(prev[a] || 0))
        );

      const entityOrder = [...MAJOR_ENTITIES, ...dynamicEntities, MERGED_ENTITY_LABEL].filter(
        (v, i, arr) => arr.indexOf(v) === i
      );

      return entityOrder.map(entity => {
        const prevVal = prev[entity] || 0;
        const currVal = curr[entity] || 0;
        const ratio = totalCurr > 0 ? ((currVal / totalCurr) * 100).toFixed(1) : '0.0';
        const change = prevVal !== 0 ? (((currVal - prevVal) / Math.abs(prevVal)) * 100).toFixed(1) : '-';
        return { entity, prevVal, currVal, ratio, change };
      });
    };

    // 손익계산서 항목 정의
    const incomeItems = [
      { key: '매출액', label: 'I. 매출액', depth: 0, bold: true, selectable: true },
      { key: '매출원가', label: 'II. 매출원가', depth: 0, bold: true, selectable: true },
      { key: '매출총이익', label: 'III. 매출총이익', depth: 0, bold: true, selectable: true },
      { key: '매출총이익률', label: '매출총이익률', depth: 0, isRate: true, rateOf: ['매출총이익', '매출액'], highlight: 'blue' },
      { key: '판매비와관리비', label: 'IV. 판매비와관리비', depth: 0, bold: true },
      { key: '인건비', label: '(1)인건비', depth: 1, selectable: true },
      { key: '광고선전비', label: '(2)광고선전비', depth: 1, selectable: true },
      { key: '수수료', label: '(3)수수료', depth: 1, selectable: true },
      { key: '감가상각비', label: '(4)감가상각비', depth: 1, selectable: true },
      { key: '기타판관비', label: '(5)기타', depth: 1, selectable: true },
      { key: '영업이익', label: 'V. 영업이익', depth: 0, bold: true, highlight: 'green', selectable: true },
      { key: '영업이익률', label: '영업이익률', depth: 0, isRate: true, rateOf: ['영업이익', '매출액'], highlight: 'blue' },
      { key: '영업외손익', label: 'VI. 영업외손익', depth: 0, bold: true, toggleParent: true },
      { key: '외환손익', label: '(1)외환손익', depth: 1, toggleChild: true },
      { key: '선물환손익', label: '(2)선물환손익', depth: 1, toggleChild: true },
      { key: '금융상품손익', label: '(3)금융상품손익', depth: 1, toggleChild: true },
      { key: '이자손익', label: '(4)이자손익', depth: 1, toggleChild: true },
      { key: '배당수익', label: '(5)배당수익', depth: 1, toggleChild: true },
      { key: '기부금', label: '(6)기부금', depth: 1, toggleChild: true },
      { key: '기타손익', label: '(7)기타손익', depth: 1, toggleChild: true },
      { key: '지분법손익', label: 'VII. 지분법손익', depth: 0, bold: true },
      { key: '법인세비용차감전순이익', label: 'VIII. 법인세비용차감전순이익', depth: 0, bold: true },
      { key: '법인세비용', label: 'IX. 법인세비용', depth: 0, bold: true },
      { key: '법인세율', label: '법인세율', depth: 0, isRate: true, rateOf: ['법인세비용', '법인세비용차감전순이익'], highlight: 'blue' },
      { key: '당기순이익', label: 'X. 당기순이익', depth: 0, bold: true, highlight: 'green', selectable: true },
      { key: '당기순이익률', label: '당기순이익률', depth: 0, isRate: true, rateOf: ['당기순이익', '매출액'], highlight: 'blue' },
    ];

    // 선택 가능한 과목 목록
    const selectableAccounts = incomeItems.filter(item => item.selectable).map(item => item.key);

    // 요약 카드 데이터
    const summaryCards = [
      {
        title: '매출액',
        key: '매출액',
        hasRate: false,
      },
      {
        title: '매출총이익',
        key: '매출총이익',
        hasRate: true,
        rateLabel: '매출총이익률',
        rateOf: ['매출총이익', '매출액'],
      },
      {
        title: '영업이익',
        key: '영업이익',
        hasRate: true,
        rateLabel: '영업이익률',
        rateOf: ['영업이익', '매출액'],
      },
      {
        title: '당기순이익',
        key: '당기순이익',
        hasRate: true,
        rateLabel: '당기순이익률',
        rateOf: ['당기순이익', '매출액'],
      },
    ];

    // 요약 카드는 조회 시점 기준 누적(연간) 데이터 사용
    const incomeSummaryYearKey = getPeriodKey(selectedPeriod, 'year');
    const incomeSummaryPrevYearKey = getPeriodKey(selectedPeriod, 'prev_year') || '2024_Year';

    return (
      <div className="space-y-4">
        {/* 요약 카드 섹션 - 조회 시점 기준 누적 실적 */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-zinc-700">실적 요약 (누적)</h3>
          </div>

          <div className="grid grid-cols-4 gap-3">
          {summaryCards.map((card, idx) => {
            // 선택된 기간 기준 누적(연간) 데이터
            const curr = incomeStatementData[incomeSummaryYearKey]?.[card.key] || 0;
            const prev = incomeStatementData[incomeSummaryPrevYearKey]?.[card.key] || 0;
            const diff = curr - prev;
            const changeRate = calculateYoY(curr, prev);
            const isPositive = parseFloat(changeRate) >= 0;
            
            // 억원 단위 변환 (백만원 -> 억원)
            const currBil = Math.round(curr / 100);
            const prevBil = Math.round(prev / 100);
            const diffBil = Math.round(diff / 100);
            
            // 조단위 포맷 함수
            const formatTrilBil = (val) => {
              if (val === 0) return '0';
              const absVal = Math.abs(val);
              const sign = val < 0 ? '-' : '';
              if (absVal >= 10000) {
                const tril = Math.floor(absVal / 10000);
                const bil = Math.round(absVal % 10000);
                return `${sign}${tril}조 ${formatNumber(bil)}`;
              }
              return `${sign}${formatNumber(absVal)}`;
            };
            
            // 비율 계산
            let currRate = null;
            let prevRate = null;
            let rateDiff = null;
            if (card.hasRate) {
              const [num, denom] = card.rateOf;
              const currNum = incomeStatementData[incomeSummaryYearKey]?.[num] || 0;
              const currDenom = incomeStatementData[incomeSummaryYearKey]?.[denom] || 0;
              const prevNum = incomeStatementData[incomeSummaryPrevYearKey]?.[num] || 0;
              const prevDenom = incomeStatementData[incomeSummaryPrevYearKey]?.[denom] || 0;
              
              currRate = currDenom > 0 ? ((currNum / currDenom) * 100).toFixed(1) : '0.0';
              prevRate = prevDenom > 0 ? ((prevNum / prevDenom) * 100).toFixed(1) : '0.0';
              rateDiff = (parseFloat(currRate) - parseFloat(prevRate)).toFixed(1);
            }
            
            // 조단위 포맷 함수 (억원 단위 입력) - 숫자와 단위 분리 반환
            const formatTrilBilSummary = (valueInBil) => {
              if (valueInBil === 0 || valueInBil === undefined || valueInBil === null) return { number: '-', unit: '' };
              const absValue = Math.abs(valueInBil);
              const sign = valueInBil < 0 ? '-' : '';
              
              if (absValue >= 10000) {
                const tril = Math.floor(absValue / 10000);
                const bil = Math.round(absValue % 10000);
                return { number: `${sign}${tril}조 ${formatNumber(bil)}`, unit: '억원' };
              }
              return { number: `${sign}${formatNumber(Math.round(absValue))}`, unit: '억원' };
            };
            
            const formatted = formatTrilBilSummary(currBil);
            const formattedPrev = formatTrilBilSummary(prevBil);
            const formattedDiff = formatTrilBilSummary(diffBil);
            
            return (
              <div 
                key={idx}
                className="bg-white rounded-lg border border-zinc-200 shadow-sm p-4 hover:shadow-md transition-shadow duration-200"
              >
                {/* 헤더: 제목과 증감률 박스 */}
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-zinc-500 uppercase tracking-wide">{card.title}</span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                    isPositive ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                  }`}>
                    {changeRate !== '-' ? `${isPositive ? '+' : ''}${changeRate}%` : '-'}
                  </span>
                </div>
                
                {/* 당년 수치 */}
                <div className="flex items-baseline gap-1 mb-3">
                  <span className="text-2xl font-bold text-zinc-900">{formatted.number}</span>
                  <span className="text-sm font-normal text-zinc-400">{formatted.unit}</span>
                </div>
                
                {/* 전년 수치 및 차액 (한 줄) */}
                <div className="text-xs text-zinc-600 mb-3">
                  전년 {formattedPrev.number.replace('억원', '억')}억원
                  {diffBil !== 0 && (
                    <span className={`ml-1 font-medium ${diffBil >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {diffBil >= 0 ? '+' : ''}{formattedDiff.number.replace('억원', '억')}억원
                    </span>
                  )}
                </div>
                
                {/* 비율 (해당되는 경우) */}
                {card.hasRate && (
                  <div className="pt-3 border-t border-zinc-100">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-400">{card.rateLabel}</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-zinc-900 font-semibold">{currRate}%</span>
                        {rateDiff !== null && parseFloat(rateDiff) !== 0 && (
                          <span className={`text-xs font-medium ${parseFloat(rateDiff) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {parseFloat(rateDiff) >= 0 ? '+' : ''}{rateDiff}%p
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          </div>
        </div>

        {/* 손익계산서 테이블 & 법인별 분석 */}
        <div className="flex flex-col xl:flex-row gap-4">
        {/* 좌측: 손익계산서 테이블 */}
        <div className="flex-1 min-w-0">
          <div className="bg-white rounded-lg border border-zinc-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-zinc-200 bg-zinc-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h3 className="text-sm font-semibold text-zinc-900">연결 손익계산서</h3>
                </div>
                {/* 분기/누적 선택 버튼 */}
                <div className="inline-flex p-0.5 bg-zinc-100 rounded-lg border border-zinc-200">
                  <button
                    onClick={() => setIncomeViewMode('quarter')}
                    className={`px-3 py-1 text-xs font-medium rounded transition-all duration-150 ${
                      incomeViewMode === 'quarter'
                        ? 'bg-white text-zinc-900 border border-zinc-200 shadow-sm'
                        : 'text-zinc-500 hover:text-zinc-700'
                    }`}
                  >
                    분기(3개월)
                  </button>
                  <button
                    onClick={() => setIncomeViewMode('annual')}
                    className={`px-3 py-1 text-xs font-medium rounded transition-all duration-150 ${
                      incomeViewMode === 'annual'
                        ? 'bg-white text-zinc-900 border border-zinc-200 shadow-sm'
                        : 'text-zinc-500 hover:text-zinc-700'
                    }`}
                  >
                    누적 (연간)
                  </button>
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-zinc-50 border-b border-zinc-200">
                    <th className="text-left px-3 py-2.5 font-semibold text-zinc-700 border-r border-zinc-200 min-w-[175px]">과목</th>
                    <th className="text-center px-3 py-2 font-semibold text-zinc-600 border-r border-zinc-200 min-w-[95px]">
                      {(() => {
                        const [yearStr, qStr] = selectedPeriod.split('_'); // 예: ['2025','Q2']
                        const quarterNum = (qStr || 'Q4').replace('Q', '');
                        const prevYear = String(Number(yearStr) - 1);
                        return incomeViewMode === 'quarter'
                          ? `${prevYear}.${quarterNum}Q`
                          : `${prevYear}년`;
                      })()}
                    </th>
                    <th className="text-center px-3 py-2 font-semibold text-zinc-900 border-r border-zinc-200 bg-zinc-100 min-w-[95px]">
                      {(() => {
                        const [yearStr, qStr] = selectedPeriod.split('_'); // 예: ['2025','Q2']
                        const quarterNum = (qStr || 'Q4').replace('Q', '');
                        return incomeViewMode === 'quarter'
                          ? `${yearStr}.${quarterNum}Q`
                          : `${yearStr}년`;
                      })()}
                    </th>
                    <th className="text-center px-3 py-2 font-semibold text-zinc-600 border-r border-zinc-200 min-w-[90px]">증감액</th>
                    <th className="text-center px-3 py-2 font-semibold text-zinc-600 min-w-[70px]">증감률</th>
                  </tr>
                </thead>
                <tbody>
                  {incomeItems.map((item, idx) => {
                    const isRateRow = item.isRate;
                    const isSelectable = item.selectable;
                    const isSelected = selectedAccount === item.key;
                    const isToggleParent = item.toggleParent;
                    const isToggleChild = item.toggleChild;
                    
                    // 토글 자식 항목이고 접혀있으면 렌더링하지 않음
                    if (isToggleChild && !isNonOperatingExpanded) {
                      return null;
                    }
                    
                    // 비율 행 처리
                    if (isRateRow) {
                      const [num, denom] = item.rateOf;
                      const ratePrev = calcRate(incomeStatementData[prevPeriod]?.[num] || 0, incomeStatementData[prevPeriod]?.[denom] || 0);
                      const rateCurr = calcRate(incomeStatementData[currPeriod]?.[num] || 0, incomeStatementData[currPeriod]?.[denom] || 0);
                      const rateDiff = calcRateDiff(rateCurr, ratePrev);
                      
                      return (
                        <tr key={idx} className="border-b border-zinc-100 bg-zinc-50/50">
                          <td className="px-3 py-2 text-blue-600 italic border-r border-zinc-200">{item.label}</td>
                          <td className="text-center px-3 py-2 text-blue-600 border-r border-zinc-200">{ratePrev}</td>
                          <td className="text-center px-3 py-2 font-medium text-blue-600 border-r border-zinc-200 bg-zinc-50">{rateCurr}</td>
                          <td colSpan="2" className={`text-center px-3 py-2 font-medium ${rateDiff.includes('+') ? 'text-emerald-600' : rateDiff.includes('-') ? 'text-rose-600' : 'text-blue-600'}`}>
                            {rateDiff}
                          </td>
                        </tr>
                      );
                    }

                    // 일반 금액 행 처리
                    const valPrev = incomeStatementData[prevPeriod]?.[item.key] || 0;
                    const valCurr = incomeStatementData[currPeriod]?.[item.key] || 0;
                    const diff = valCurr - valPrev;
                    const changeRate = calculateYoY(valCurr, valPrev);
                    
                    const highlightClass = item.highlight === 'green' ? 'bg-emerald-50/50' : '';
                    const selectableClass = isSelectable ? 'cursor-pointer hover:bg-zinc-100' : '';
                    const selectedClass = isSelected ? 'bg-zinc-100 ring-1 ring-zinc-300 ring-inset' : '';
                    const toggleParentClass = isToggleParent ? 'cursor-pointer hover:bg-zinc-50' : '';
                    
                    return (
                      <tr 
                        key={idx} 
                        className={`border-b border-zinc-100 ${highlightClass} ${selectableClass} ${selectedClass} ${toggleParentClass}`}
                        onClick={() => {
                          if (isSelectable) setSelectedAccount(item.key);
                          if (isToggleParent) setIsNonOperatingExpanded(!isNonOperatingExpanded);
                        }}
                      >
                        <td className={`px-3 py-2 border-r border-zinc-200 ${item.bold ? 'font-semibold text-zinc-900' : 'text-zinc-600'} ${item.depth === 1 ? 'pl-6' : ''}`}>
                          {isToggleParent && (
                            <span className="inline-flex items-center justify-center w-4 h-4 mr-1.5 rounded bg-zinc-200 text-zinc-600 text-xs font-medium">
                              {isNonOperatingExpanded ? '−' : '+'}
                            </span>
                          )}
                          {item.label}
                        </td>
                        <td className="text-right px-3 py-2 text-zinc-500 border-r border-zinc-200 tabular-nums">{formatNumber(valPrev)}</td>
                        <td className={`text-right px-3 py-2 border-r border-zinc-200 tabular-nums bg-zinc-50/50 ${item.bold ? 'font-semibold text-zinc-900' : 'text-zinc-700'}`}>{formatNumber(valCurr)}</td>
                        <td className={`text-right px-3 py-2 font-medium border-r border-zinc-200 tabular-nums ${diff >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {diff !== 0 ? formatNumber(diff) : '-'}
                        </td>
                        <td className={`text-right px-3 py-2 font-medium tabular-nums ${parseFloat(changeRate) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {changeRate !== '-' ? `${changeRate}%` : '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* 우측: 법인별 분석 */}
        <div className="w-full xl:w-[360px] flex-shrink-0 space-y-3">
          {/* 법인별 분석 헤더 */}
          <div className="bg-white rounded-lg border border-zinc-200 shadow-sm p-4">
            <h3 className="text-sm font-semibold text-zinc-900 mb-0.5">
              {incomeItems.find(i => i.key === selectedAccount)?.label || selectedAccount} 법인별 분석
            </h3>
            <p className="text-xs text-zinc-400">{periodLabel} 기준 법인별 비중</p>
            
            {/* 도넛 차트 영역 */}
            <div className="flex justify-around mt-4">
              <div className="text-center">
                <p className="text-xs font-medium text-zinc-500 mb-2">
                  {incomeViewMode === 'quarter' ? '2024.4Q' : '2024년'}
                </p>
                <div style={{ width: 110, height: 110 }}>
                  {getDonutData(prevPeriod).length > 0 ? (
                    <PieChart width={110} height={110}>
                      <Pie
                        data={getDonutData(prevPeriod)}
                        cx={55}
                        cy={55}
                        innerRadius={28}
                        outerRadius={48}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {getDonutData(prevPeriod).map((entry, index) => (
                          <Cell key={`cell-prev-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        content={<CustomPieTooltip formatter={(value) => `${formatNumber(Math.round(value/100))}억원`} />}
                      />
                    </PieChart>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-400 text-xs">데이터 없음</div>
                  )}
                </div>
              </div>
              <div className="text-center">
                <p className="text-xs font-medium text-zinc-500 mb-2">
                  {incomeViewMode === 'quarter' 
                    ? (() => {
                        const [yearStr, qStr] = selectedPeriod.split('_');
                        const quarterNum = (qStr || 'Q4').replace('Q', '');
                        return `${yearStr}.${quarterNum}Q`;
                      })()
                    : '2025년'}
                </p>
                <div style={{ width: 110, height: 110 }}>
                  {getDonutData(currPeriod).length > 0 ? (
                    <PieChart width={110} height={110}>
                      <Pie
                        data={getDonutData(currPeriod)}
                        cx={55}
                        cy={55}
                        innerRadius={28}
                        outerRadius={48}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {getDonutData(currPeriod).map((entry, index) => (
                          <Cell key={`cell-curr-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        content={<CustomPieTooltip formatter={(value) => `${formatNumber(Math.round(value/100))}억원`} />}
                      />
                    </PieChart>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-400 text-xs">데이터 없음</div>
                  )}
                </div>
              </div>
            </div>
            
            {/* 범례 */}
            <div className="flex flex-wrap justify-center gap-3 mt-3">
              {Object.entries(entityColors).map(([name, color]) => (
                <div key={name} className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }}></span>
                  <span className="text-xs text-zinc-500">{name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 법인별 테이블 */}
          <div className="bg-white rounded-lg border border-zinc-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-zinc-50 border-b border-zinc-200">
                  <th className="text-left px-3 py-2 font-semibold text-zinc-600 min-w-[80px] whitespace-nowrap">법인</th>
                  <th className="text-right px-2 py-2 font-semibold text-zinc-600 min-w-[85px]">
                    {incomeViewMode === 'quarter' ? '24.4Q' : '2024'}
                  </th>
                  <th className="text-right px-2 py-2 font-semibold text-zinc-600 min-w-[85px]">
                    {incomeViewMode === 'quarter' ? '25.4Q' : '2025'}
                  </th>
                  <th className="text-right px-2 py-2 font-semibold text-zinc-600 min-w-[55px]">비중</th>
                  <th className="text-right px-3 py-2 font-semibold text-zinc-600 min-w-[70px] whitespace-nowrap">YoY</th>
                </tr>
              </thead>
              <tbody>
                {getEntityTableData().map((row, idx) => (
                  <tr key={idx} className="border-b border-zinc-100 hover:bg-zinc-50 transition-colors">
                    <td className="px-3 py-2 text-zinc-700 whitespace-nowrap">
                      <span 
                        className="inline-block w-2 h-2 rounded-full mr-1.5" 
                        style={{ backgroundColor: entityColors[row.entity] }}
                      ></span>
                      {row.entity}
                    </td>
                    <td className="text-right px-2 py-2 text-zinc-500 tabular-nums">{formatNumber(row.prevVal)}</td>
                    <td className="text-right px-2 py-2 text-zinc-900 font-medium tabular-nums">{formatNumber(row.currVal)}</td>
                    <td className="text-right px-2 py-2 text-zinc-500 tabular-nums">{row.ratio}%</td>
                    <td className={`text-right px-3 py-2 font-medium tabular-nums whitespace-nowrap ${parseFloat(row.change) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {row.change !== '-' ? `${parseFloat(row.change) >= 0 ? '+' : ''}${row.change}%` : '-'}
                    </td>
                  </tr>
                ))}
                {/* 합계 행 */}
                <tr className="bg-zinc-50 font-medium">
                  <td className="px-3 py-2 text-zinc-900 whitespace-nowrap">합계</td>
                  <td className="text-right px-2 py-2 text-zinc-700 tabular-nums">
                    {formatNumber(getEntityTableData().reduce((sum, r) => sum + r.prevVal, 0))}
                  </td>
                  <td className="text-right px-2 py-2 text-zinc-900 tabular-nums">
                    {formatNumber(getEntityTableData().reduce((sum, r) => sum + r.currVal, 0))}
                  </td>
                  <td className="text-right px-2 py-2 text-zinc-700 tabular-nums">100%</td>
                  <td className="text-right px-3 py-2 text-zinc-400 whitespace-nowrap">-</td>
                </tr>
              </tbody>
            </table>
            <p className="text-[10px] text-zinc-400 px-3 py-1.5 bg-zinc-50 border-t border-zinc-100">* 단위: 백만원 (연결조정 전 법인별 합산)</p>
          </div>

          {/* 법인별 증감 분석 - 동적 생성 */}
          <div className="bg-white rounded-lg border border-zinc-200 shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-zinc-900">
                {incomeItems.find(i => i.key === selectedAccount)?.label || selectedAccount} 증감 분석
              </h3>
              <button
                onClick={() => setIncomeEditMode(!incomeEditMode)}
                className={`text-xs px-1.5 py-1 rounded transition-colors ${
                  incomeEditMode 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                }`}
                title={incomeEditMode ? '편집 완료' : '분석 문장 편집'}
              >
                {incomeEditMode ? '✓' : '✏️'}
              </button>
            </div>
            <div className="space-y-2 text-xs">
              {(() => {
                const tableData = getEntityTableData().filter(row => row.entity !== '기타');
                const totalCurr = tableData.reduce((sum, r) => sum + r.currVal, 0);
                const totalPrev = tableData.reduce((sum, r) => sum + r.prevVal, 0);
                const totalDiff = totalCurr - totalPrev;
                
                // 법인 순서 고정: OC(국내), 중국, 홍콩, ST미국, 기타(연결조정)
                const sortedData = [...tableData].sort((a, b) => {
                  const orderA = ENTITY_ORDER.indexOf(a.entity);
                  const orderB = ENTITY_ORDER.indexOf(b.entity);
                  return (orderA === -1 ? 999 : orderA) - (orderB === -1 ? 999 : orderB);
                });
                
                return sortedData.map((row, idx) => {
                    const diff = row.currVal - row.prevVal;
                    const isPositive = diff >= 0;
                    const contribution = totalDiff !== 0 ? ((diff / Math.abs(totalDiff)) * 100).toFixed(0) : 0;
                    const diffBil = Math.round(diff / 100); // 억원 단위
                    
                    const displayAmount = `${isPositive ? '+' : ''}${formatNumber(diffBil)}`;
                    const displayRate = row.change;
                    const displayContribution = contribution;
                    
                    const colorMap = {
                      'OC(국내)': { bg: 'bg-blue-50/50', border: 'border-blue-400' },
                      '중국': { bg: 'bg-amber-50/50', border: 'border-amber-400' },
                      '홍콩': { bg: 'bg-violet-50/50', border: 'border-violet-400' },
                      'ST미국': { bg: 'bg-emerald-50/50', border: 'border-emerald-400' },
                    };
                    const colors = colorMap[row.entity] || { bg: 'bg-zinc-50', border: 'border-zinc-300' };
                    
                    // 문장형 분석 생성 (기본값) 또는 편집된 값 사용
                    const editKey = `${selectedAccount}_${row.entity}`;
                    const defaultTexts = generateIncomeAnalysisText(selectedAccount, row.entity, currPeriod, prevPeriod);
                    const analysisTexts = incomeEditData[editKey] || defaultTexts;
                    
                    return (
                      <div key={idx} className={`p-2.5 ${colors.bg} rounded-lg border-l-2 ${colors.border}`}>
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-zinc-800">{row.entity}</span>
                          <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${parseFloat(displayRate) >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                            {parseFloat(displayRate) >= 0 ? '▲' : '▼'} {displayRate}%
                          </span>
                        </div>
                        <div className="mt-1.5 flex items-center justify-between text-[11px]">
                          <span className="text-zinc-500">{displayAmount}억원</span>
                          <span className="text-zinc-400">기여도 {displayContribution}%</span>
                        </div>
                        {/* 문장형 증감 분석 - 편집 가능 */}
                        {analysisTexts.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-zinc-200/50">
                            <div className="space-y-1">
                              {analysisTexts.map((text, i) => (
                                incomeEditMode ? (
                                  <div key={i} className="flex items-start gap-1">
                                    <span className="text-[11px] text-zinc-500 mt-0.5">•</span>
                                    <textarea
                                      value={text}
                                      onChange={(e) => {
                                        const newTexts = [...analysisTexts];
                                        newTexts[i] = e.target.value;
                                        setIncomeEditData(prev => ({
                                          ...prev,
                                          [editKey]: newTexts
                                        }));
                                      }}
                                      className="flex-1 text-[11px] text-zinc-600 leading-relaxed px-1.5 py-1 rounded bg-white border border-zinc-300 focus:outline-none focus:ring-1 focus:ring-blue-400 resize-none"
                                      rows={2}
                                    />
                                  </div>
                                ) : (
                                  <p key={i} className="text-[11px] text-zinc-600 leading-relaxed">
                                    • {text}
                                  </p>
                                )
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  });
              })()}
            </div>
            
            {/* 전체 요약 */}
            {(() => {
              const tableData = getEntityTableData();
              const totalCurr = tableData.reduce((sum, r) => sum + r.currVal, 0);
              const totalPrev = tableData.reduce((sum, r) => sum + r.prevVal, 0);
              const totalDiff = totalCurr - totalPrev;
              const totalDiffBil = Math.round(totalDiff / 100);
              const totalChange = totalPrev !== 0 ? ((totalDiff / totalPrev) * 100).toFixed(1) : 0;
              const isPositive = totalDiff >= 0;
              
              // 편집된 전체 데이터
              const totalEditKey = `${selectedAccount}_total`;
              const totalEdited = incomeEditData[totalEditKey] || {};
              const displayTotalAmount = totalEdited.amount !== undefined ? totalEdited.amount : `${isPositive ? '+' : ''}${formatNumber(totalDiffBil)}`;
              const displayTotalRate = totalEdited.rate !== undefined ? totalEdited.rate : `${isPositive ? '+' : ''}${totalChange}`;
              
              return (
                <div className="mt-3 pt-3 border-t border-zinc-200">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-600 font-medium">전체 YoY 변동</span>
                    {incomeEditMode ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={displayTotalAmount}
                          onChange={(e) => setIncomeEditData(prev => ({
                            ...prev,
                            [totalEditKey]: { ...prev[totalEditKey], amount: e.target.value }
                          }))}
                          className="w-20 text-right text-xs font-bold px-1 py-0.5 rounded bg-white border border-zinc-300 focus:outline-none focus:ring-1 focus:ring-blue-400"
                        />
                        <span className="text-zinc-500">억원 (</span>
                        <input
                          type="text"
                          value={displayTotalRate}
                          onChange={(e) => setIncomeEditData(prev => ({
                            ...prev,
                            [totalEditKey]: { ...prev[totalEditKey], rate: e.target.value }
                          }))}
                          className="w-14 text-right text-xs font-bold px-1 py-0.5 rounded bg-white border border-zinc-300 focus:outline-none focus:ring-1 focus:ring-blue-400"
                        />
                        <span className="text-zinc-500">%)</span>
                      </div>
                    ) : (
                      <span className={`font-bold ${parseFloat(displayTotalRate) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {displayTotalAmount}억원 ({displayTotalRate}%)
                      </span>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
    );
  };

  // ============================================
  // 재무상태표 탭 렌더링
  // ============================================
  const renderBalanceSheetTab = () => {
      // 운전자본 계산 (매출채권 + 재고자산 - 매입채무)
    const calcWorkingCapital = (period) => {
      const bs = balanceSheetData[period];
      return (bs?.매출채권 || 0) + (bs?.재고자산 || 0) - (bs?.매입채무 || 0);
    };

    // ROE 계산 (당기순이익 / 자본총계 * 100)
    // period에 해당하는 연도의 당기순이익을 사용해야 함
    const calcROE = (period) => {
      // period에서 연도 추출 (예: '2024_4Q' -> '2024', '2025_4Q' -> '2025')
      const periodYear = period.split('_')[0];
      const periodQuarter = period.split('_')[1].replace('Q', '');
      
      // 해당 연도의 연간 당기순이익 키 생성
      // 4Q면 'YYYY_Year', 그 외는 'YYYY_XQ_Year' 형식
      const yearKey = periodQuarter === '4' 
        ? `${periodYear}_Year` 
        : `${periodYear}_${periodQuarter}Q_Year`;
      
      const netIncome = incomeStatementData[yearKey]?.당기순이익 || 0;
      const equity = balanceSheetData[period]?.자본총계 || 0;
      if (!equity || equity === 0) return 0;
      return ((netIncome / equity) * 100).toFixed(1);
    };

    // 조단위 포맷 함수 (억원 단위 입력받아 조단위 표기)
    const formatTrilBil = (valueInBil) => {
      if (valueInBil === 0 || valueInBil === undefined || valueInBil === null) return '-';
      const absValue = Math.abs(valueInBil);
      const sign = valueInBil < 0 ? '-' : '';
      
      if (absValue >= 10000) {
        const tril = Math.floor(absValue / 10000);
        const bil = Math.round(absValue % 10000);
        return `${sign}${tril}조 ${formatNumber(bil)}`;
      }
      return `${sign}${formatNumber(Math.round(absValue))}`;
    };

    // 요약 카드 데이터 (억원 단위) - 항상 전기말(전년 연말)과 비교
    const prevYearEnd = '2024_4Q'; // 전기말 고정
    const summaryCards = [
      { 
        title: '자산총계', 
        curr: (balanceSheetData[bsCurrentPeriod]?.자산총계 || 0) / 100,
        prev: (balanceSheetData[prevYearEnd]?.자산총계 || 0) / 100,
        unit: '억원',
        useTril: true,
      },
      { 
        title: '운전자본', 
        curr: calcWorkingCapital(bsCurrentPeriod) / 100,
        prev: calcWorkingCapital(prevYearEnd) / 100,
        unit: '억원',
        useTril: false,
      },
      { 
        title: '자본총계', 
        curr: (balanceSheetData[bsCurrentPeriod]?.자본총계 || 0) / 100,
        prev: (balanceSheetData[prevYearEnd]?.자본총계 || 0) / 100,
        unit: '억원',
        useTril: true,
      },
      { 
        title: 'ROE', 
        curr: calcROE(bsCurrentPeriod),
        prev: calcROE(prevYearEnd),
        isRatio: true,
      },
    ];

    // 재무상태표 항목 (성격별 분류 - 유동/비유동 통합)
    const balanceItems = [
      // 자산
      { key: '현금성자산', label: '현금성자산', depth: 1, selectable: true },
      { key: '금융상품', label: '금융상품', depth: 1 },
      { key: '매출채권', label: '매출채권', depth: 1, selectable: true },
      { key: '재고자산', label: '재고자산', depth: 1, selectable: true },
      { key: '관계기업투자', label: '관계기업투자', depth: 1 },
      { key: '유무형자산', label: '유·무형자산', depth: 1, selectable: true },
      { key: '사용권자산', label: '사용권자산', depth: 1, selectable: true },
      { key: '기타자산', label: '기타자산', depth: 1 },
      { key: '자산총계', label: '자산총계', bold: true, highlight: 'blue' },
      // 부채
      { key: '차입금', label: '차입금', depth: 1, selectable: true },
      { key: '매입채무', label: '매입채무', depth: 1, selectable: true },
      { key: '미지급금', label: '미지급금', depth: 1 },
      { key: '리스부채', label: '리스부채', depth: 1 },
      { key: '보증금', label: '보증금', depth: 1 },
      { key: '기타부채', label: '기타부채', depth: 1 },
      { key: '부채총계', label: '부채총계', bold: true, highlight: 'red' },
      // 자본 (총계만)
      { key: '자본총계', label: '자본총계', bold: true, highlight: 'green' },
    ];

    // 법인별 데이터는 컴포넌트 상위 레벨에서 정의됨 (entityBSData)
    // 아래 중복 정의는 제거됨 - 상위 레벨의 entityBSData 사용

    // 분기별 법인별 추이 데이터 (24.1Q ~ 25.4Q)
    const quarterlyEntityData = {
      현금성자산: [
        { quarter: '24.1Q', 'OC(국내)': 291693, 중국: 12162, 기타: 30852 },
        { quarter: '24.2Q', 'OC(국내)': 161519, 중국: 27175, 기타: 31918 },
        { quarter: '24.3Q', 'OC(국내)': 142325, 중국: 24304, 기타: 27134 },
        { quarter: '24.4Q', 'OC(국내)': 61500, 중국: 29229, 기타: 32444 },
        { quarter: '25.1Q', 'OC(국내)': 79496, 중국: 60404, 기타: 24144 },
        { quarter: '25.2Q', 'OC(국내)': 88735, 중국: 20311, 기타: 17394 },
        { quarter: '25.3Q', 'OC(국내)': 182075, 중국: 9318, 기타: 16892 },
      ],
      매출채권: [
        { quarter: '24.1Q', 'OC(국내)': 109224, 중국: 7225, 기타: 11233 },
        { quarter: '24.2Q', 'OC(국내)': 91507, 중국: 7183, 기타: 11546 },
        { quarter: '24.3Q', 'OC(국내)': 137912, 중국: 81857, 기타: 15304 },
        { quarter: '24.4Q', 'OC(국내)': 134453, 중국: 40081, 기타: 18050 },
        { quarter: '25.1Q', 'OC(국내)': 123193, 중국: 20896, 기타: 11603 },
        { quarter: '25.2Q', 'OC(국내)': 81953, 중국: 8793, 기타: 11029 },
        { quarter: '25.3Q', 'OC(국내)': 205309, 중국: 97531, 기타: 19691 },
      ],
      재고자산: [
        { quarter: '24.1Q', 'OC(국내)': 232095, 중국: 136110, 기타: 37423 },
        { quarter: '24.2Q', 'OC(국내)': 207444, 중국: 115040, 기타: 35388 },
        { quarter: '24.3Q', 'OC(국내)': 247068, 중국: 174481, 기타: 39236 },
        { quarter: '24.4Q', 'OC(국내)': 214281, 중국: 141223, 기타: 43928 },
        { quarter: '25.1Q', 'OC(국내)': 214607, 중국: 123617, 기타: 43546 },
        { quarter: '25.2Q', 'OC(국내)': 199308, 중국: 113822, 기타: 38577 },
        { quarter: '25.3Q', 'OC(국내)': 242024, 중국: 281973, 기타: 46723 },
      ],
      유무형자산: [
        { quarter: '24.1Q', 'OC(국내)': 197870, 중국: 9894, 기타: 68713 },
        { quarter: '24.2Q', 'OC(국내)': 251498, 중국: 10189, 기타: 70542 },
        { quarter: '24.3Q', 'OC(국내)': 345549, 중국: 9901, 기타: 66407 },
        { quarter: '24.4Q', 'OC(국내)': 609769, 중국: 10416, 기타: 73425 },
        { quarter: '25.1Q', 'OC(국내)': 611019, 중국: 9130, 기타: 72558 },
        { quarter: '25.2Q', 'OC(국내)': 607960, 중국: 7699, 기타: 67842 },
        { quarter: '25.3Q', 'OC(국내)': 605413, 중국: 8114, 기타: 71004 },
      ],
      사용권자산: [
        { quarter: '24.1Q', 'OC(국내)': 182423, 중국: 62091, 기타: 41112 },
        { quarter: '24.2Q', 'OC(국내)': 181318, 중국: 73343, 기타: 40874 },
        { quarter: '24.3Q', 'OC(국내)': 185625, 중국: 77192, 기타: 42094 },
        { quarter: '24.4Q', 'OC(국내)': 183782, 중국: 93085, 기타: 48578 },
        { quarter: '25.1Q', 'OC(국내)': 187827, 중국: 64626, 기타: 33029 },
        { quarter: '25.2Q', 'OC(국내)': 188380, 중국: 54824, 기타: 29404 },
        { quarter: '25.3Q', 'OC(국내)': 186612, 중국: 56782, 기타: 42060 },
      ],
      차입금: [
        { quarter: '24.1Q', 'OC(국내)': 0, 중국: 72442, 기타: 19871 },
        { quarter: '24.2Q', 'OC(국내)': 0, 중국: 0, 기타: 20260 },
        { quarter: '24.3Q', 'OC(국내)': 0, 중국: 86820, 기타: 26418 },
        { quarter: '24.4Q', 'OC(국내)': 45000, 중국: 100635, 기타: 33248 },
        { quarter: '25.1Q', 'OC(국내)': 20000, 중국: 56470, 기타: 40635 },
        { quarter: '25.2Q', 'OC(국내)': 0, 중국: 32157, 기타: 41841 },
        { quarter: '25.3Q', 'OC(국내)': 0, 중국: 160605, 기타: 49840 },
      ],
      매입채무: [
        { quarter: '24.1Q', 'OC(국내)': 69104, 중국: 5104, 기타: 46999 },
        { quarter: '24.2Q', 'OC(국내)': 48681, 중국: 1415, 기타: 46111 },
        { quarter: '24.3Q', 'OC(국내)': 115166, 중국: 63397, 기타: 45417 },
        { quarter: '24.4Q', 'OC(국내)': 79795, 중국: 17885, 기타: 53121 },
        { quarter: '25.1Q', 'OC(국내)': 69813, 중국: 28622, 기타: 47991 },
        { quarter: '25.2Q', 'OC(국내)': 53644, 중국: 10263, 기타: 43041 },
        { quarter: '25.3Q', 'OC(국내)': 139941, 중국: 131315, 기타: 50833 },
      ],
    };

    const entityColors = {
      'OC(국내)': '#3B82F6',
      중국: '#F59E0B',
      홍콩: '#8B5CF6',
      ST미국: '#10B981',
      연결조정: '#9CA3AF',
      '기타(연결조정)': '#6B7280',
    };

    // 추이 그래프용 색상
    const trendColors = {
      'OC(국내)': '#3B82F6',
      중국: '#F59E0B',
      기타: '#8B5CF6',
    };

    // ============================================
    // 재무상태표 법인별 분석 데이터 정합성 보정
    // - entityBSData는 연결조정 전 법인별 합산이라 연결(BS) 합계와 불일치 가능
    // - 선택 계정/기간의 연결 금액(balanceSheetData)을 기준으로
    //   1) base(법인별 합산) 스케일링
    //   2) 차이는 '연결조정' 항목으로 보정
    // ============================================
    const getBSConsolidatedTotal = (accountKey, period) => {
      const v = balanceSheetData?.[period]?.[accountKey];
      return typeof v === 'number' ? v : 0;
    };

    const getBaseBSBreakdown = (accountKey, period) => {
      const p = entityBSData?.[period];
      if (!p) return {};
      return p[accountKey] || p['자산총계'] || {};
    };

    const getAlignedBSBreakdown = (accountKey, period) => {
      const consolidatedTotal = getBSConsolidatedTotal(accountKey, period);
      const base = getBaseBSBreakdown(accountKey, period);
      const baseKeys = Object.keys(base);

      if (baseKeys.length === 0) {
        return { 연결조정: consolidatedTotal };
      }

      const baseSum = baseKeys.reduce((sum, k) => sum + (base[k] || 0), 0);
      if (baseSum === 0) {
        return { ...base, 연결조정: consolidatedTotal };
      }

      const scale = consolidatedTotal / baseSum;
      const scaled = {};
      for (const k of baseKeys) {
        scaled[k] = Math.round((base[k] || 0) * scale);
      }

      const scaledSum = Object.values(scaled).reduce((sum, v) => sum + (v || 0), 0);
      const adjustment = consolidatedTotal - scaledSum;
      return { ...scaled, 연결조정: adjustment };
    };

    // 표시용 그룹핑: 비중이 작은 법인 + 연결조정을 '기타(연결조정)'로 합산
    const BS_MINOR_ENTITY_RATIO_THRESHOLD = 0.03; // 3% 미만은 기타로 합산
    const BS_MERGED_ENTITY_LABEL = '기타(연결조정)';
    const BS_MAJOR_ENTITIES = ['OC(국내)', '중국'];

    // 단일 기간용 (도넛 차트 등)
    const getGroupedBSBreakdown = (accountKey, period) => {
      return getGroupedBSBreakdownForComparison(accountKey, period, period);
    };

    // 비교용: 전기/당기 둘 다를 고려하여, 한 기간이라도 유의미하면 개별로 유지
    const getGroupedBSBreakdownForComparison = (accountKey, prevPeriod, currPeriod) => {
      const totalCurr = getBSConsolidatedTotal(accountKey, currPeriod);
      const totalPrev = getBSConsolidatedTotal(accountKey, prevPeriod);
      const alignedCurr = getAlignedBSBreakdown(accountKey, currPeriod);
      const alignedPrev = getAlignedBSBreakdown(accountKey, prevPeriod);

      // 전기/당기 모두의 키를 합집합으로 수집
      const allKeys = Array.from(new Set([...Object.keys(alignedPrev), ...Object.keys(alignedCurr)]));

      const grouped = {};
      const entitiesToKeep = new Set();

      // 1. OC(국내), 중국은 항상 유지
      BS_MAJOR_ENTITIES.forEach(entity => {
        if (allKeys.includes(entity)) {
          entitiesToKeep.add(entity);
        }
      });

      // 2. 전기나 당기 중 하나라도 데이터가 있고, 그 기간의 비중이 3% 이상이면 개별로 유지
      for (const name of allKeys) {
        if (BS_MAJOR_ENTITIES.includes(name) || name === '연결조정' || name === '기타') continue;

        const prevVal = alignedPrev[name] || 0;
        const currVal = alignedCurr[name] || 0;
        
        const prevRatio = totalPrev !== 0 ? Math.abs(prevVal) / Math.abs(totalPrev) : 0;
        const currRatio = totalCurr !== 0 ? Math.abs(currVal) / Math.abs(totalCurr) : 0;

        // 전기나 당기 중 하나라도 데이터가 있고, 그 기간의 비중이 3% 이상이면 개별 유지
        const hasDataInEitherPeriod = prevVal !== 0 || currVal !== 0;
        const isSignificantInEitherPeriod = prevRatio >= BS_MINOR_ENTITY_RATIO_THRESHOLD || currRatio >= BS_MINOR_ENTITY_RATIO_THRESHOLD;

        if (hasDataInEitherPeriod && isSignificantInEitherPeriod) {
          entitiesToKeep.add(name);
        }
      }

      // 3. 유지할 법인들을 grouped에 추가 (당기 값을 사용)
      entitiesToKeep.forEach(name => {
        grouped[name] = alignedCurr[name] || 0;
      });

      // 4. 나머지는 기타(연결조정)로 흡수 (합계 정합성 보장)
      const keptSum = Object.values(grouped).reduce((s, v) => s + (v || 0), 0);
      grouped[BS_MERGED_ENTITY_LABEL] = totalCurr - keptSum;

      return grouped;
    };

    // 도넛 차트 데이터 생성 함수
    const getBSDonutData = (period) => {
      const accountData = getGroupedBSBreakdown(selectedBSAccount, period);
      const total = getBSConsolidatedTotal(selectedBSAccount, period);
      if (!accountData || total === 0) return [];

      return Object.entries(accountData)
        .map(([name, value]) => ({
          name,
          value: Math.abs(value),      // 차트 표시용(절대값)
          valueRaw: value || 0,        // 테이블 표시용(원값)
          ratio: total !== 0 ? ((Math.abs(value) / Math.abs(total)) * 100).toFixed(1) : '0.0',
          color:
            name === BS_MERGED_ENTITY_LABEL
              ? '#6B7280'
              : (entityColors[name] || '#9CA3AF'),
        }))
        .filter((item) => item.value > 0);
    };

    // 도넛 차트 데이터 미리 계산
    const donutData2024 = getBSDonutData(bsPrevPeriod);
    const donutData2025 = getBSDonutData(bsCurrentPeriod);

    return (
      <div className="space-y-4">
        {/* 요약 카드 섹션 */}
        <div className="grid grid-cols-4 gap-3">
          {summaryCards.map((card, idx) => {
            const curr = parseFloat(card.curr) || 0;
            const prev = parseFloat(card.prev) || 0;
            const diff = curr - prev;
            const changeRate = prev !== 0 ? ((curr - prev) / Math.abs(prev) * 100).toFixed(1) : '-';
            const isPositive = parseFloat(changeRate) >= 0;
            
            return (
              <div 
                key={idx}
                className="bg-white rounded-lg border border-zinc-200 shadow-sm p-4 hover:shadow-md transition-all duration-200"
              >
                {/* 헤더: 제목과 증감률 박스 */}
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-zinc-500 uppercase tracking-wide">{card.title}</span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                    isPositive ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                  }`}>
                    {changeRate !== '-' ? `${isPositive ? '+' : ''}${changeRate}%` : '-'}
                  </span>
                </div>
                
                {/* 당기 수치 */}
                <div className="flex items-baseline gap-1 mb-3">
                  <span className="text-2xl font-bold text-zinc-900 tracking-tight">
                    {card.isRatio ? `${curr}%` : (card.useTril ? formatTrilBil(curr) : formatNumber(Math.round(curr)))}
                  </span>
                  {card.unit && <span className="text-sm font-normal text-zinc-400">{card.unit}</span>}
                </div>
                
                {/* 전년 수치 및 차액 (한 줄) */}
                <div className="text-xs text-zinc-600 mb-3">
                  전년 {card.isRatio ? `${prev}%` : `${card.useTril ? formatTrilBil(prev) : formatNumber(Math.round(prev))}${card.unit || '억원'}`}
                  {!card.isRatio && diff !== 0 && (
                    <span className={`ml-1 font-medium ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {isPositive ? '+' : ''}{formatNumber(Math.round(diff))}{card.unit || '억원'}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* 재무상태표 테이블 & 법인별 분석 */}
        <div className="flex flex-col xl:flex-row gap-4">
          {/* 좌측: 재무상태표 테이블 */}
          <div className="flex-1 min-w-0">
            <div className="bg-white rounded-lg border border-zinc-200 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-zinc-200 bg-zinc-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <h3 className="text-sm font-semibold text-zinc-900">연결 재무상태표</h3>
                  </div>
                  {/* 동분기/전기말 선택 버튼 */}
                  <div className="inline-flex p-0.5 bg-zinc-100 rounded-lg border border-zinc-200">
                    <button
                      onClick={() => setBsCompareMode('sameQuarter')}
                      className={`px-3 py-1 text-xs font-medium rounded transition-all duration-150 ${
                        bsCompareMode === 'sameQuarter'
                          ? 'bg-white text-zinc-900 border border-zinc-200 shadow-sm'
                          : 'text-zinc-500 hover:text-zinc-700'
                      }`}
                    >
                      동분기
                    </button>
                    <button
                      onClick={() => setBsCompareMode('prevYearEnd')}
                      className={`px-3 py-1 text-xs font-medium rounded transition-all duration-150 ${
                        bsCompareMode === 'prevYearEnd'
                          ? 'bg-white text-zinc-900 border border-zinc-200 shadow-sm'
                          : 'text-zinc-500 hover:text-zinc-700'
                      }`}
                    >
                      전기말
                    </button>
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-zinc-50 border-b border-zinc-200">
                      <th className="text-left px-3 py-2.5 font-semibold text-zinc-700 border-r border-zinc-200 min-w-[175px]">과목</th>
                      <th className="text-center px-3 py-2 font-semibold text-zinc-600 border-r border-zinc-200 min-w-[95px]">{getBsPeriodLabel(bsPrevPeriod)}</th>
                      <th className="text-center px-3 py-2 font-semibold text-zinc-900 border-r border-zinc-200 bg-zinc-100 min-w-[95px]">{getBsPeriodLabel(bsCurrentPeriod)}</th>
                      <th className="text-center px-3 py-2 font-semibold text-zinc-600 border-r border-zinc-200 min-w-[90px]">증감액</th>
                      <th className="text-center px-3 py-2 font-semibold text-zinc-600 min-w-[70px]">증감률</th>
                    </tr>
                  </thead>
                  <tbody>
                    {balanceItems.map((item, idx) => {
                      const val2024 = balanceSheetData[bsPrevPeriod]?.[item.key] || 0;
                      const val2025 = balanceSheetData[bsCurrentPeriod]?.[item.key] || 0;
                      const diff = val2025 - val2024;
                      const change = calculateYoY(val2025, val2024);
                      
                      const highlightClass = item.highlight === 'blue' ? 'bg-blue-50/50' 
                        : item.highlight === 'green' ? 'bg-emerald-50/50' 
                        : item.highlight === 'red' ? 'bg-rose-50/50' 
                        : '';
                      const selectableClass = item.selectable ? 'cursor-pointer hover:bg-zinc-100' : '';
                      const isSelected = selectedBSAccount === item.key;
                      const selectedClass = isSelected ? 'bg-zinc-100 ring-1 ring-zinc-300 ring-inset' : '';
                      
                      return (
                        <tr 
                          key={idx} 
                          className={`border-b border-zinc-100 ${highlightClass} ${selectableClass} ${selectedClass}`}
                          onClick={() => item.selectable && setSelectedBSAccount(item.key)}
                        >
                          <td className={`px-3 py-2 border-r border-zinc-200 ${item.bold ? 'font-semibold text-zinc-900' : 'text-zinc-600'} ${item.depth === 1 ? 'pl-6' : ''}`}>
                            {item.label}
                          </td>
                          <td className="text-right px-3 py-2 text-zinc-500 border-r border-zinc-200 tabular-nums">{formatNumber(val2024)}</td>
                          <td className={`text-right px-3 py-2 border-r border-zinc-200 tabular-nums ${item.bold ? 'font-semibold text-zinc-900' : 'text-zinc-700'}`}>{formatNumber(val2025)}</td>
                          <td className={`text-right px-3 py-2 font-medium border-r border-zinc-200 tabular-nums ${diff >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {diff !== 0 ? formatNumber(diff) : '-'}
                          </td>
                          <td className={`text-right px-3 py-2 font-medium tabular-nums ${parseFloat(change) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {change !== '-' ? `${change}%` : '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 분기별 법인별 추이 그래프 */}
            {balanceItems.find(i => i.key === selectedBSAccount)?.selectable && quarterlyEntityData[selectedBSAccount] && (
              <div className="bg-white rounded-lg border border-zinc-200 shadow-sm p-4 mt-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-zinc-900">
                    {balanceItems.find(i => i.key === selectedBSAccount)?.label || selectedBSAccount} 분기별 추이
                  </h3>
                  <div className="flex items-center gap-4">
                    {Object.entries(trendColors).map(([name, color]) => (
                      <div key={name} className="flex items-center gap-1.5">
                        <span className="w-3 h-0.5 rounded" style={{ backgroundColor: color }}></span>
                        <span className="text-xs text-zinc-500">{name}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ height: 220 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={quarterlyEntityData[selectedBSAccount]} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis 
                        dataKey="quarter" 
                        tick={{ fontSize: 11, fill: '#6b7280' }}
                        axisLine={{ stroke: '#d1d5db' }}
                        tickLine={{ stroke: '#d1d5db' }}
                      />
                      <YAxis 
                        tick={{ fontSize: 10, fill: '#6b7280' }}
                        axisLine={{ stroke: '#d1d5db' }}
                        tickLine={{ stroke: '#d1d5db' }}
                        tickFormatter={(value) => value >= 1000 ? `${(value / 1000).toFixed(0)}K` : value}
                      />
                      <Tooltip 
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-white/95 backdrop-blur-sm border border-zinc-200 rounded-lg shadow-lg px-3 py-2.5 min-w-[130px]">
                                <p className="text-xs font-medium text-zinc-500 mb-1.5 pb-1.5 border-b border-zinc-100">{label}</p>
                                <div className="space-y-1">
                                  {payload.map((entry, index) => (
                                    <div key={index} className="flex items-center justify-between gap-3">
                                      <div className="flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
                                        <span className="text-xs text-zinc-600">{entry.dataKey}</span>
                                      </div>
                                      <span className="text-xs font-semibold text-zinc-900">{formatNumber(entry.value)}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="OC(국내)" 
                        stroke={trendColors['OC(국내)']} 
                        strokeWidth={2.5}
                        dot={{ r: 4, fill: trendColors['OC(국내)'], strokeWidth: 0 }}
                        activeDot={{ r: 6, strokeWidth: 2, stroke: '#fff' }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="중국" 
                        stroke={trendColors['중국']} 
                        strokeWidth={2.5}
                        dot={{ r: 4, fill: trendColors['중국'], strokeWidth: 0 }}
                        activeDot={{ r: 6, strokeWidth: 2, stroke: '#fff' }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="기타" 
                        stroke={trendColors['기타']} 
                        strokeWidth={2.5}
                        dot={{ r: 4, fill: trendColors['기타'], strokeWidth: 0 }}
                        activeDot={{ r: 6, strokeWidth: 2, stroke: '#fff' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-xs text-zinc-400 mt-2 text-center">* 기타 = 홍콩 + ST미국</p>
              </div>
            )}
          </div>

          {/* 우측: 법인별 분석 */}
          <div className="w-full xl:w-[360px] flex-shrink-0 space-y-3">
            {/* 법인별 분석 헤더 */}
            <div className="bg-white rounded-lg border border-zinc-200 shadow-sm p-4">
              <h3 className="text-sm font-semibold text-zinc-900 mb-0.5">
                {balanceItems.find(i => i.key === selectedBSAccount)?.label || selectedBSAccount} 법인별 분석
              </h3>
              <p className="text-xs text-zinc-400">기말 기준 법인별 비중</p>
              
              {/* 도넛 차트 영역 */}
              <div className="flex justify-around mt-4">
                {/* 비교 기준 기간 도넛 */}
                <div className="text-center">
                  <p className="text-xs font-medium text-zinc-500 mb-2">{getBsPeriodLabel(bsPrevPeriod)}</p>
                  <div style={{ width: 120, height: 120 }}>
                    {donutData2024.length > 0 ? (
                      <PieChart width={120} height={120}>
                        <Pie
                          data={donutData2024}
                          cx={60}
                          cy={60}
                          innerRadius={30}
                          outerRadius={50}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {donutData2024.map((entry, index) => (
                            <Cell key={`cell-2024-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomPieTooltip formatter={(value) => `${formatNumber(value)} 백만원`} />} />
                      </PieChart>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-zinc-400 text-xs">데이터 없음</div>
                    )}
                  </div>
                </div>
                {/* 2025년 도넛 */}
                <div className="text-center">
                  <p className="text-xs font-medium text-zinc-500 mb-2">
                    {(() => {
                      const [yearStr, qStr] = selectedPeriod.split('_');
                      const quarterNum = (qStr || 'Q4').replace('Q', '');
                      return `${yearStr}.${quarterNum}Q`;
                    })()}
                  </p>
                  <div style={{ width: 120, height: 120 }}>
                    {donutData2025.length > 0 ? (
                      <PieChart width={120} height={120}>
                        <Pie
                          data={donutData2025}
                          cx={60}
                          cy={60}
                          innerRadius={30}
                          outerRadius={50}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {donutData2025.map((entry, index) => (
                            <Cell key={`cell-2025-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomPieTooltip formatter={(value) => `${formatNumber(value)} 백만원`} />} />
                      </PieChart>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-zinc-400 text-xs">데이터 없음</div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* 범례 */}
              <div className="flex flex-wrap justify-center gap-3 mt-3">
                {Object.entries(entityColors).map(([name, color]) => (
                  <div key={name} className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }}></span>
                    <span className="text-xs text-zinc-600">{name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 법인별 테이블 */}
            <div className="bg-white rounded-lg border border-zinc-200 shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-zinc-50 border-b border-zinc-200">
                    <th className="text-left px-3 py-2 font-semibold text-zinc-600 min-w-[80px] whitespace-nowrap">법인</th>
                    <th className="text-right px-2 py-2 font-semibold text-zinc-600 min-w-[85px]">{getBsPeriodLabel(bsPrevPeriod)}</th>
                    <th className="text-right px-2 py-2 font-semibold text-zinc-600 min-w-[85px]">{getBsPeriodLabel(bsCurrentPeriod)}</th>
                    <th className="text-right px-2 py-2 font-semibold text-zinc-600 min-w-[55px]">비중</th>
                    <th className="text-right px-3 py-2 font-semibold text-zinc-600 min-w-[70px] whitespace-nowrap">YoY</th>
                  </tr>
                </thead>
                <tbody>
                  {donutData2025.map((entity, idx) => {
                    const prev = donutData2024.find(e => e.name === entity.name)?.valueRaw ?? donutData2024.find(e => e.name === entity.name)?.value ?? 0;
                    const curr = entity.valueRaw ?? entity.value;
                    const yoy = prev !== 0 ? ((curr - prev) / prev * 100).toFixed(1) : '-';
                    const isPositive = parseFloat(yoy) >= 0;
                    
                    return (
                      <tr key={idx} className="border-b border-zinc-100">
                        <td className="px-3 py-2 text-zinc-700 whitespace-nowrap">
                          <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: entity.color }}></span>
                          {entity.name}
                        </td>
                        <td className="text-right px-2 py-2 text-zinc-500 tabular-nums">{formatNumber(prev)}</td>
                        <td className="text-right px-2 py-2 font-medium text-zinc-900 tabular-nums">{formatNumber(curr)}</td>
                        <td className="text-right px-2 py-2 text-zinc-600 tabular-nums">{entity.ratio}%</td>
                        <td className={`text-right px-3 py-2 font-medium tabular-nums whitespace-nowrap ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {yoy !== '-' ? `${isPositive ? '+' : ''}${yoy}%` : '-'}
                        </td>
                      </tr>
                    );
                  })}
                  {/* 합계 행 */}
                  {(() => {
                    const totalPrev = getBSConsolidatedTotal(selectedBSAccount, bsPrevPeriod);
                    const totalCurr = getBSConsolidatedTotal(selectedBSAccount, bsCurrentPeriod);
                    const totalYoy = totalPrev !== 0 ? ((totalCurr - totalPrev) / totalPrev * 100).toFixed(1) : '-';
                    const isPositive = parseFloat(totalYoy) >= 0;

                    return (
                      <tr className="bg-zinc-50 font-medium">
                        <td className="px-3 py-2 text-zinc-900 whitespace-nowrap">합계</td>
                        <td className="text-right px-2 py-2 text-zinc-700 tabular-nums">{formatNumber(totalPrev)}</td>
                        <td className="text-right px-2 py-2 text-zinc-900 tabular-nums">{formatNumber(totalCurr)}</td>
                        <td className="text-right px-2 py-2 text-zinc-700 tabular-nums">100%</td>
                        <td className={`text-right px-3 py-2 tabular-nums whitespace-nowrap ${totalYoy === '-' ? 'text-zinc-400' : isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {totalYoy !== '-' ? `${isPositive ? '+' : ''}${totalYoy}%` : '-'}
                        </td>
                      </tr>
                    );
                  })()}
                </tbody>
              </table>
            </div>

            {/* 법인별 증감 분석 */}
            <div className="bg-white rounded-lg border border-zinc-200 shadow-sm p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-zinc-900">
                  {balanceItems.find(i => i.key === selectedBSAccount)?.label || selectedBSAccount} 증감 분석
                </h3>
                <button
                  onClick={() => setBsEditMode(!bsEditMode)}
                  className={`text-xs px-1.5 py-1 rounded transition-colors ${
                    bsEditMode 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                  }`}
                  title={bsEditMode ? '편집 완료' : '분석 문장 편집'}
                >
                  {bsEditMode ? '✓' : '✏️'}
                </button>
              </div>
              <div className="space-y-2 text-xs">
                {(() => {
                  const curr2025 = getAlignedBSBreakdown(selectedBSAccount, bsCurrentPeriod);
                  const curr2024 = getAlignedBSBreakdown(selectedBSAccount, bsPrevPeriod);
                  
                  // 법인별 증감 계산
                  const changes = Object.keys(curr2025)
                    .filter(entity => entity !== '기타')
                    .map(entity => ({
                      name: entity,
                      currVal: curr2025[entity] || 0,
                      prevVal: curr2024[entity] || 0,
                      diff: (curr2025[entity] || 0) - (curr2024[entity] || 0),
                      rate: curr2024[entity] !== 0 ? ((curr2025[entity] - curr2024[entity]) / Math.abs(curr2024[entity]) * 100).toFixed(1) : 0
                    }));
                  
                  // 법인 순서 고정: OC(국내), 중국, 홍콩, ST미국, 기타(연결조정)
                  const sortedChanges = [...changes].sort((a, b) => {
                    const orderA = ENTITY_ORDER.indexOf(a.name);
                    const orderB = ENTITY_ORDER.indexOf(b.name);
                    return (orderA === -1 ? 999 : orderA) - (orderB === -1 ? 999 : orderB);
                  });
                  
                  const total2025 = getBSConsolidatedTotal(selectedBSAccount, bsCurrentPeriod);
                  const total2024 = getBSConsolidatedTotal(selectedBSAccount, bsPrevPeriod);
                  const totalDiff = total2025 - total2024;
                  
                  const colorMap = {
                    'OC(국내)': { bg: 'bg-blue-50/50', border: 'border-blue-400' },
                    '중국': { bg: 'bg-amber-50/50', border: 'border-amber-400' },
                    '홍콩': { bg: 'bg-violet-50/50', border: 'border-violet-400' },
                    'ST미국': { bg: 'bg-emerald-50/50', border: 'border-emerald-400' },
                  };
                  
                  return sortedChanges.map((row, idx) => {
                    const isPositive = row.diff >= 0;
                    const contribution = totalDiff !== 0 ? ((row.diff / Math.abs(totalDiff)) * 100).toFixed(0) : 0;
                    const diffBil = Math.round(row.diff / 100); // 억원 단위
                    const colors = colorMap[row.name] || { bg: 'bg-zinc-50', border: 'border-zinc-300' };
                    
                    const displayAmount = `${isPositive ? '+' : ''}${formatNumber(diffBil)}`;
                    const displayRate = row.rate;
                    const displayContribution = contribution;
                    
                    // 문장형 분석 생성 (기본값) 또는 편집된 값 사용
                    const editKey = `${selectedBSAccount}_${row.name}`;
                    const defaultTexts = generateBSAnalysisText(selectedBSAccount, row.name, bsCurrentPeriod, bsPrevPeriod);
                    const bsAnalysisTexts = bsEditData[editKey] || defaultTexts;
                    
                    return (
                      <div key={idx} className={`p-2.5 ${colors.bg} rounded-lg border-l-2 ${colors.border}`}>
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-zinc-800">{row.name}</span>
                          <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${parseFloat(displayRate) >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                            {parseFloat(displayRate) >= 0 ? '▲' : '▼'} {displayRate}%
                          </span>
                        </div>
                        <div className="mt-1.5 flex items-center justify-between text-[11px]">
                          <span className="text-zinc-500">{displayAmount}억원</span>
                          <span className="text-zinc-400">기여도 {displayContribution}%</span>
                        </div>
                        {/* 문장형 증감 분석 - 편집 가능 */}
                        {bsAnalysisTexts.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-zinc-200/50">
                            <div className="space-y-1">
                              {bsAnalysisTexts.map((text, i) => (
                                bsEditMode ? (
                                  <div key={i} className="flex items-start gap-1">
                                    <span className="text-[11px] text-zinc-500 mt-0.5">•</span>
                                    <textarea
                                      value={text}
                                      onChange={(e) => {
                                        const newTexts = [...bsAnalysisTexts];
                                        newTexts[i] = e.target.value;
                                        setBsEditData(prev => ({
                                          ...prev,
                                          [editKey]: newTexts
                                        }));
                                      }}
                                      className="flex-1 text-[11px] text-zinc-600 leading-relaxed px-1.5 py-1 rounded bg-white border border-zinc-300 focus:outline-none focus:ring-1 focus:ring-blue-400 resize-none"
                                      rows={2}
                                    />
                                  </div>
                                ) : (
                                  <p key={i} className="text-[11px] text-zinc-600 leading-relaxed">
                                    • {text}
                                  </p>
                                )
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  });
                })()}
              </div>
              
              {/* 전체 요약 */}
              {(() => {
                const total2025 = getBSConsolidatedTotal(selectedBSAccount, bsCurrentPeriod);
                const total2024 = getBSConsolidatedTotal(selectedBSAccount, bsPrevPeriod);
                const totalDiff = total2025 - total2024;
                const totalDiffBil = Math.round(totalDiff / 100);
                const totalChange = total2024 !== 0 ? ((totalDiff / Math.abs(total2024)) * 100).toFixed(1) : 0;
                const isPositive = totalDiff >= 0;
                
                // 편집된 전체 데이터
                const totalEditKey = `${selectedBSAccount}_total`;
                const totalEdited = bsEditData[totalEditKey] || {};
                const displayTotalAmount = totalEdited.amount !== undefined ? totalEdited.amount : `${isPositive ? '+' : ''}${formatNumber(totalDiffBil)}`;
                const displayTotalRate = totalEdited.rate !== undefined ? totalEdited.rate : `${isPositive ? '+' : ''}${totalChange}`;
                
                return (
                  <div className="mt-3 pt-3 border-t border-zinc-200">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-600 font-medium">전체 YoY 변동</span>
                      {bsEditMode ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={displayTotalAmount}
                            onChange={(e) => setBsEditData(prev => ({
                              ...prev,
                              [totalEditKey]: { ...prev[totalEditKey], amount: e.target.value }
                            }))}
                            className="w-20 text-right text-xs font-bold px-1 py-0.5 rounded bg-white border border-zinc-300 focus:outline-none focus:ring-1 focus:ring-blue-400"
                          />
                          <span className="text-zinc-500">억원 (</span>
                          <input
                            type="text"
                            value={displayTotalRate}
                            onChange={(e) => setBsEditData(prev => ({
                              ...prev,
                              [totalEditKey]: { ...prev[totalEditKey], rate: e.target.value }
                            }))}
                            className="w-14 text-right text-xs font-bold px-1 py-0.5 rounded bg-white border border-zinc-300 focus:outline-none focus:ring-1 focus:ring-blue-400"
                          />
                          <span className="text-zinc-500">%)</span>
                        </div>
                      ) : (
                        <span className={`font-bold ${parseFloat(displayTotalRate) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {displayTotalAmount}억원 ({displayTotalRate}%)
                        </span>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ============================================
  // 메인 렌더링
  // ============================================
  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="max-w-6xl mx-auto p-4">
        {/* 헤더 */}
        <div className="mb-12">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-zinc-900 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">F&F</span>
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">F&F Corporation</h1>
              <p className="text-sm text-zinc-500">2025 4Q 연결 재무제표</p>
            </div>
          </div>
        </div>

        {/* 탭 네비게이션 및 기간 선택 */}
        <div className="mb-6 flex items-center justify-between">
          <div className="inline-flex p-0.5 bg-zinc-100 rounded-lg border border-zinc-200">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 text-sm font-medium rounded transition-all duration-150 ${
                  activeTab === tab.id
                    ? 'bg-white text-zinc-900 border border-zinc-200'
                    : 'text-zinc-500 hover:text-zinc-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="px-4 py-2 bg-zinc-900 text-white text-sm font-medium rounded-lg border-none outline-none cursor-pointer hover:bg-zinc-800 transition-colors"
            >
              <option value="2025_Q1">FY2025 1Q</option>
              <option value="2025_Q2">FY2025 2Q</option>
              <option value="2025_Q3">FY2025 3Q</option>
              <option value="2025_Q4">FY2025 4Q</option>
            </select>
          </div>
        </div>

        {/* 탭 컨텐츠 */}
        <div>
          {activeTab === 'summary' && renderSummaryTab()}
          {activeTab === 'income' && renderIncomeTab()}
          {activeTab === 'balance' && renderBalanceSheetTab()}
        </div>

        {/* 푸터 */}
        <div className="mt-6 pt-4 border-t border-zinc-200">
          <p className="text-xs text-zinc-400 text-center">
            © 2025 F&F Corporation | 단위: 백만원
          </p>
        </div>
      </div>
    </div>
  );
}
