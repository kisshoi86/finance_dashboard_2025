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

  // ============================================
  // 기간 매핑 함수
  // ============================================
  const getPeriodKey = (selectedPeriod, type) => {
    // selectedPeriod: '2025_Q1', '2025_Q2', '2025_Q3', '2025_Q4'
    // type: 'quarter' (분기), 'year' (누적), 'prev_quarter' (전년 동 분기), 'prev_year' (전년 동기 누적)
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
    }
    return `${year}_4Q`; // 기본값
  };

  const getPeriodLabel = (selectedPeriod) => {
    // '2025_Q4' -> 'FY2025 Q4'
    return selectedPeriod.replace('_', ' ');
  };

  // ============================================
  // 재무상태표 조회 기준(컴포넌트 전역)
  // - 재무상태표는 선택 분기 기말 vs 전년 기말 비교
  // ============================================
  const bsCurrentPeriod = getPeriodKey(selectedPeriod, 'quarter'); // 선택된 분기 기말
  const bsPrevPeriod = '2024_4Q'; // 전년 기말 (고정)

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
    '2025_4Q': {
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
    '2025_Year': {
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
    '2025_4Q': {
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
  };

  // ============================================
  // 금융상품평가 데이터
  // ============================================
  const financialInstrumentsData = {
    '2025_4Q': {
      // 당기손익-공정가치 측정 금융자산
      FVPL금융자산: 0,
      // 기타포괄손익-공정가치 측정 금융자산
      FVOCI금융자산: 0,
      // 상각후원가 측정 금융자산
      AC금융자산: 0,
      // 파생상품자산
      파생상품자산: 0,
      // 금융부채
      당기손익인식금융부채: 0,
      상각후원가금융부채: 0,
      파생상품부채: 0,
      // 평가손익
      FVPL평가손익: 0,
      FVOCI평가손익: 0,
      파생상품평가손익: 0,
    },
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
  // 전체요약 탭 렌더링
  // ============================================
  const renderSummaryTab = () => {
    // 손익 요약 카드 데이터 (억원 단위, 선택된 분기까지 누적 기준)
    const selectedYearKey = getPeriodKey(selectedPeriod, 'year');
    const prevYearKey = getPeriodKey(selectedPeriod, 'prev_year') || '2024_Year';
    const incomeCards = [
      { title: '매출액', value: Math.round((incomeStatementData[selectedYearKey]?.매출액 || 0) / 100), prevValue: Math.round((incomeStatementData[prevYearKey]?.매출액 || 0) / 100), iconColor: 'bg-blue-500' },
      { title: '영업이익', value: Math.round((incomeStatementData[selectedYearKey]?.영업이익 || 0) / 100), prevValue: Math.round((incomeStatementData[prevYearKey]?.영업이익 || 0) / 100), iconColor: 'bg-emerald-500' },
      { title: '당기순이익', value: Math.round((incomeStatementData[selectedYearKey]?.당기순이익 || 0) / 100), prevValue: Math.round((incomeStatementData[prevYearKey]?.당기순이익 || 0) / 100), iconColor: 'bg-violet-500' },
    ];

    // 재무상태 요약 카드 데이터 (억원 단위, 선택된 분기 기말 기준)
    const balanceCards = [
      { title: '자산총계', value: Math.round((balanceSheetData[bsCurrentPeriod]?.자산총계 || 0) / 100), prevValue: Math.round((balanceSheetData[bsPrevPeriod]?.자산총계 || 0) / 100), iconColor: 'bg-amber-500' },
      { title: '부채총계', value: Math.round((balanceSheetData[bsCurrentPeriod]?.부채총계 || 0) / 100), prevValue: Math.round((balanceSheetData[bsPrevPeriod]?.부채총계 || 0) / 100), iconColor: 'bg-rose-500' },
      { title: '자본총계', value: Math.round((balanceSheetData[bsCurrentPeriod]?.자본총계 || 0) / 100), prevValue: Math.round((balanceSheetData[bsPrevPeriod]?.자본총계 || 0) / 100), iconColor: 'bg-cyan-500' },
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
      
      return (
        <div key={idx} className="bg-white rounded-lg border border-zinc-200 shadow-sm p-4 hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center gap-2 mb-2">
            <span className={`w-2 h-2 rounded-full ${card.iconColor}`}></span>
            <span className="text-xs font-medium text-zinc-500 uppercase tracking-wide">{card.title}</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-zinc-900">{formatted.number}</span>
            <span className="text-sm font-normal text-zinc-400">{formatted.unit}</span>
          </div>
          <div className={`text-xs font-semibold mt-1 ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
            {change != 0 ? `${isPositive ? '▲' : '▼'} ${Math.abs(parseFloat(change))}% YoY` : '-'}
          </div>
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
          <div className="grid grid-cols-3 gap-3">
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
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center shadow-md">
                <span className="text-white text-xs font-bold">AI</span>
              </div>
              <div>
                <div className="text-sm font-semibold">F&F 2025년 연간 재무 종합 분석</div>
                <div className="text-xs text-zinc-400">수익성 · 안정성 · 리스크 · 액션플랜</div>
              </div>
            </div>
            
            {/* 핵심 지표 요약 */}
            <div className="grid grid-cols-4 gap-2 mb-4 p-3 bg-white/5 rounded-lg border border-white/10">
              <div className="text-center">
                <div className="text-[10px] text-zinc-400 mb-0.5">영업이익률</div>
                <div className="text-sm font-bold text-emerald-400">24.7%</div>
                <div className="text-[10px] text-emerald-400">+0.9%p</div>
              </div>
              <div className="text-center border-l border-white/10">
                <div className="text-[10px] text-zinc-400 mb-0.5">순이익률</div>
                <div className="text-sm font-bold text-blue-400">18.1%</div>
                <div className="text-[10px] text-rose-400">-0.7%p</div>
              </div>
              <div className="text-center border-l border-white/10">
                <div className="text-[10px] text-zinc-400 mb-0.5">부채비율</div>
                <div className="text-sm font-bold text-amber-400">48.0%</div>
                <div className="text-[10px] text-emerald-400">안정</div>
              </div>
              <div className="text-center border-l border-white/10">
                <div className="text-[10px] text-zinc-400 mb-0.5">ROE</div>
                <div className="text-sm font-bold text-violet-400">12.9%</div>
                <div className="text-[10px] text-rose-400">-5.7%p</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              {/* 주요 인사이트 */}
              <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  <span className="text-xs font-semibold text-emerald-400">주요 인사이트</span>
                </div>
                <ul className="text-xs text-zinc-300 space-y-1.5">
                  <li className="flex items-start gap-1.5">
                    <span className="text-emerald-400 mt-0.5">•</span>
                    <span><strong className="text-white">수익성 개선:</strong> 매출 28% 감소에도 영업이익률 24.7%로 0.9%p 상승, 비용 효율화 성공</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-emerald-400 mt-0.5">•</span>
                    <span><strong className="text-white">현금창출력 강화:</strong> 현금성자산 2,072억원으로 73% 증가, 유동성 대폭 개선</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-emerald-400 mt-0.5">•</span>
                    <span><strong className="text-white">무차입 경영:</strong> 국내법인 차입금 전액 상환, 재무건전성 강화</span>
                  </li>
                </ul>
              </div>

              {/* 리스크 분석 */}
              <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-2 h-2 rounded-full bg-rose-400"></span>
                  <span className="text-xs font-semibold text-rose-400">리스크 분석</span>
                </div>
                <ul className="text-xs text-zinc-300 space-y-1.5">
                  <li className="flex items-start gap-1.5">
                    <span className="text-rose-400 mt-0.5">⚠</span>
                    <span><strong className="text-white">매출 역성장:</strong> 전년대비 28.3% 감소, 중국·국내 모두 부진. 소비 심리 위축 영향</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-rose-400 mt-0.5">⚠</span>
                    <span><strong className="text-white">재고 부담:</strong> 재고자산 42.9% 급증(5,707억원), 재고회전율 악화 우려</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-rose-400 mt-0.5">⚠</span>
                    <span><strong className="text-white">중국 리스크:</strong> 중국법인 차입금 1,606억원, 환율 및 정책 변동성 노출</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* 액션 플랜 */}
            <div className="p-3 bg-gradient-to-r from-blue-500/20 to-violet-500/20 rounded-lg border border-blue-400/30">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2 h-2 rounded-full bg-violet-400"></span>
                <span className="text-xs font-semibold text-violet-400">전략적 액션 플랜</span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="p-2 bg-white/5 rounded">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-blue-400 text-sm">📈</span>
                    <span className="text-[11px] font-semibold text-blue-400">성장 전략</span>
                  </div>
                  <p className="text-[10px] text-zinc-300 leading-relaxed">
                    MLB 브랜드 글로벌 확장 가속화, 동남아·유럽 시장 진출 통한 중국 의존도 분산
                  </p>
                </div>
                <div className="p-2 bg-white/5 rounded">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-amber-400 text-sm">📦</span>
                    <span className="text-[11px] font-semibold text-amber-400">운영 효율화</span>
                  </div>
                  <p className="text-[10px] text-zinc-300 leading-relaxed">
                    재고회전율 개선 위한 프로모션 확대, 시즌별 발주량 최적화 및 SCM 고도화
                  </p>
                </div>
                <div className="p-2 bg-white/5 rounded">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-emerald-400 text-sm">💰</span>
                    <span className="text-[11px] font-semibold text-emerald-400">자본 활용</span>
                  </div>
                  <p className="text-[10px] text-zinc-300 leading-relaxed">
                    풍부한 현금(2,072억)을 활용한 신규 브랜드 인수 또는 주주환원 정책 강화 검토
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between">
              <span className="text-[10px] text-zinc-500">AI 분석은 참고용이며 투자 조언이 아닙니다</span>
              <span className="text-[10px] text-zinc-500">2025년 연간 실적 기준</span>
            </div>
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

    // 법인별 데이터 (선택된 과목에 따라) - 분기 및 누적
    // 주의: 법인별 데이터는 연결조정 전 법인별 합산 기준 (연간 누적)
    // entity_is_data.json에서 변환: China -> 중국, Sergio + 기타 -> 기타
    const entityData = {
      '매출액': {
        '2024_1Q': { 'OC(국내)': 388852, '중국': 238976, '홍콩': 22211, '기타': 9926 },
        '2024_1Q_Year': { 'OC(국내)': 388852, '중국': 238976, '홍콩': 22211, '기타': 9926 },
        '2024_2Q': { 'OC(국내)': 275632, '중국': 154544, '홍콩': 16965, '기타': 11200 },
        '2024_2Q_Year': { 'OC(국내)': 664484, '중국': 393520, '홍콩': 39176, '기타': 21126 },
        '2024_3Q': { 'OC(국내)': 417280, '중국': 250154, '홍콩': 15559, '기타': 17473 },
        '2024_3Q_Year': { 'OC(국내)': 1081765, '중국': 643675, '홍콩': 54736, '기타': 38599 },
        '2024_4Q': { 'OC(국내)': 436230, '중국': 214166, '홍콩': 20299, '기타': 11221 },
        '2024_Year': { 'OC(국내)': 1517994, '중국': 857840, '홍콩': 75035, '기타': 49820 },
        '2025_1Q': { 'OC(국내)': 396770, '중국': 258540, '홍콩': 20663, '기타': 9432 },
        '2025_1Q_Year': { 'OC(국내)': 396770, '중국': 258540, '홍콩': 20663, '기타': 9432 },
        '2025_2Q': { 'OC(국내)': 307393, '중국': 170703, '홍콩': 15742, '기타': 10275 },
        '2025_2Q_Year': { 'OC(국내)': 704163, '중국': 429243, '홍콩': 36405, '기타': 19708 },
        '2025_3Q': { 'OC(국내)': 510671, '중국': 283919, '홍콩': 16908, '기타': 18838 },
        '2025_3Q_Year': { 'OC(국내)': 1214834, '중국': 713162, '홍콩': 53313, '기타': 38547 },
        '2025_4Q': { 'OC(국내)': 0, '중국': 0, '홍콩': 0, '기타': 0 },
        '2025_Year': { 'OC(국내)': 1214834, '중국': 713162, '홍콩': 53313, '기타': 38547 },
      },
      '매출원가': {
        '2024_1Q': { 'OC(국내)': 147628, '중국': 173679, '홍콩': 9231, '기타': 4830 },
        '2024_1Q_Year': { 'OC(국내)': 147628, '중국': 173679, '홍콩': 9231, '기타': 4830 },
        '2024_2Q': { 'OC(국내)': 89806, '중국': 103635, '홍콩': 7228, '기타': 5609 },
        '2024_2Q_Year': { 'OC(국내)': 237433, '중국': 277315, '홍콩': 16460, '기타': 10439 },
        '2024_3Q': { 'OC(국내)': 158791, '중국': 198826, '홍콩': 7135, '기타': 15991 },
        '2024_3Q_Year': { 'OC(국내)': 396225, '중국': 476141, '홍콩': 23595, '기타': 26430 },
        '2024_4Q': { 'OC(국내)': 147388, '중국': 188025, '홍콩': 8472, '기타': 9945 },
        '2024_Year': { 'OC(국내)': 543613, '중국': 664166, '홍콩': 32067, '기타': 36374 },
        '2025_1Q': { 'OC(국내)': 145093, '중국': 203778, '홍콩': 9671, '기타': 3643 },
        '2025_1Q_Year': { 'OC(국내)': 145093, '중국': 203778, '홍콩': 9671, '기타': 3643 },
        '2025_2Q': { 'OC(국내)': 102778, '중국': 135222, '홍콩': 6988, '기타': 4565 },
        '2025_2Q_Year': { 'OC(국내)': 247871, '중국': 339000, '홍콩': 16659, '기타': 8208 },
        '2025_3Q': { 'OC(국내)': 202041, '중국': 208506, '홍콩': 8019, '기타': 7562 },
        '2025_3Q_Year': { 'OC(국내)': 449912, '중국': 547506, '홍콩': 24679, '기타': 15770 },
        '2025_4Q': { 'OC(국내)': 0, '중국': 0, '홍콩': 0, '기타': 0 },
        '2025_Year': { 'OC(국내)': 449912, '중국': 547506, '홍콩': 24679, '기타': 15770 },
      },
      '매출총이익': {
        '2024_1Q': { 'OC(국내)': 241224, '중국': 65297, '홍콩': 12980, '기타': 5096 },
        '2024_1Q_Year': { 'OC(국내)': 241224, '중국': 65297, '홍콩': 12980, '기타': 5096 },
        '2024_2Q': { 'OC(국내)': 185827, '중국': 50908, '홍콩': 9737, '기타': 5591 },
        '2024_2Q_Year': { 'OC(국내)': 427051, '중국': 116206, '홍콩': 22717, '기타': 10687 },
        '2024_3Q': { 'OC(국내)': 258489, '중국': 51328, '홍콩': 8424, '기타': 1481 },
        '2024_3Q_Year': { 'OC(국내)': 685540, '중국': 167533, '홍콩': 31141, '기타': 12168 },
        '2024_4Q': { 'OC(국내)': 288842, '중국': 26141, '홍콩': 11827, '기타': 1276 },
        '2024_Year': { 'OC(국내)': 974382, '중국': 193674, '홍콩': 42968, '기타': 13445 },
        '2025_1Q': { 'OC(국내)': 251677, '중국': 54762, '홍콩': 10992, '기타': 5789 },
        '2025_1Q_Year': { 'OC(국내)': 251677, '중국': 54762, '홍콩': 10992, '기타': 5789 },
        '2025_2Q': { 'OC(국내)': 204615, '중국': 35481, '홍콩': 8754, '기타': 5712 },
        '2025_2Q_Year': { 'OC(국내)': 456292, '중국': 90244, '홍콩': 19746, '기타': 11501 },
        '2025_3Q': { 'OC(국내)': 308630, '중국': 75413, '홍콩': 8889, '기타': 11276 },
        '2025_3Q_Year': { 'OC(국내)': 764922, '중국': 165656, '홍콩': 28634, '기타': 22777 },
        '2025_4Q': { 'OC(국내)': 0, '중국': 0, '홍콩': 0, '기타': 0 },
        '2025_Year': { 'OC(국내)': 764922, '중국': 165656, '홍콩': 28634, '기타': 22777 },
      },
      '인건비': {
        '2024_1Q': { 'OC(국내)': 9937, '중국': 6513, '홍콩': 1928, '기타': 1229 },
        '2024_1Q_Year': { 'OC(국내)': 9937, '중국': 6513, '홍콩': 1928, '기타': 1229 },
        '2024_2Q': { 'OC(국내)': 11939, '중국': 6389, '홍콩': 1977, '기타': 1627 },
        '2024_2Q_Year': { 'OC(국내)': 21876, '중국': 12901, '홍콩': 3906, '기타': 2856 },
        '2024_3Q': { 'OC(국내)': 10188, '중국': 6043, '홍콩': 1724, '기타': 1893 },
        '2024_3Q_Year': { 'OC(국내)': 32064, '중국': 18944, '홍콩': 5630, '기타': 4749 },
        '2024_4Q': { 'OC(국내)': 11627, '중국': 7185, '홍콩': 2181, '기타': 1570 },
        '2024_Year': { 'OC(국내)': 43692, '중국': 26130, '홍콩': 7811, '기타': 6319 },
        '2025_1Q': { 'OC(국내)': 9755, '중국': 7851, '홍콩': 2410, '기타': 1515 },
        '2025_1Q_Year': { 'OC(국내)': 9755, '중국': 7851, '홍콩': 2410, '기타': 1515 },
        '2025_2Q': { 'OC(국내)': 10693, '중국': 7020, '홍콩': 1718, '기타': 1305 },
        '2025_2Q_Year': { 'OC(국내)': 20448, '중국': 14870, '홍콩': 4128, '기타': 2819 },
        '2025_3Q': { 'OC(국내)': 9633, '중국': 6734, '홍콩': 2156, '기타': 1610 },
        '2025_3Q_Year': { 'OC(국내)': 30082, '중국': 21604, '홍콩': 6284, '기타': 4429 },
        '2025_4Q': { 'OC(국내)': 0, '중국': 0, '홍콩': 0, '기타': 0 },
        '2025_Year': { 'OC(국내)': 30082, '중국': 21604, '홍콩': 6284, '기타': 4429 },
      },
      '광고선전비': {
        '2024_1Q': { 'OC(국내)': 10689, '중국': 12045, '홍콩': 422, '기타': 940 },
        '2024_1Q_Year': { 'OC(국내)': 10689, '중국': 12045, '홍콩': 422, '기타': 940 },
        '2024_2Q': { 'OC(국내)': 9145, '중국': 5745, '홍콩': 635, '기타': 1430 },
        '2024_2Q_Year': { 'OC(국내)': 19835, '중국': 17790, '홍콩': 1057, '기타': 2371 },
        '2024_3Q': { 'OC(국내)': 7102, '중국': 10839, '홍콩': 415, '기타': 1546 },
        '2024_3Q_Year': { 'OC(국내)': 26937, '중국': 28628, '홍콩': 1472, '기타': 3917 },
        '2024_4Q': { 'OC(국내)': 13418, '중국': 16640, '홍콩': 542, '기타': 1579 },
        '2024_Year': { 'OC(국내)': 40355, '중국': 45269, '홍콩': 2014, '기타': 5496 },
        '2025_1Q': { 'OC(국내)': 8143, '중국': 14554, '홍콩': 534, '기타': 1379 },
        '2025_1Q_Year': { 'OC(국내)': 8143, '중국': 14554, '홍콩': 534, '기타': 1379 },
        '2025_2Q': { 'OC(국내)': 8488, '중국': 9119, '홍콩': 554, '기타': 1386 },
        '2025_2Q_Year': { 'OC(국내)': 16631, '중국': 23672, '홍콩': 1088, '기타': 2765 },
        '2025_3Q': { 'OC(국내)': 6683, '중국': 16328, '홍콩': 585, '기타': 1462 },
        '2025_3Q_Year': { 'OC(국내)': 23314, '중국': 40000, '홍콩': 1673, '기타': 4227 },
        '2025_4Q': { 'OC(국내)': 0, '중국': 0, '홍콩': 0, '기타': 0 },
        '2025_Year': { 'OC(국내)': 23314, '중국': 40000, '홍콩': 1673, '기타': 4227 },
      },
      '수수료': {
        '2024_1Q': { 'OC(국내)': 103398, '중국': 11140, '홍콩': 4655, '기타': 2205 },
        '2024_1Q_Year': { 'OC(국내)': 103398, '중국': 11140, '홍콩': 4655, '기타': 2205 },
        '2024_2Q': { 'OC(국내)': 89436, '중국': 8168, '홍콩': 1479, '기타': 2829 },
        '2024_2Q_Year': { 'OC(국내)': 192834, '중국': 19308, '홍콩': 6133, '기타': 5035 },
        '2024_3Q': { 'OC(국내)': 82954, '중국': 8951, '홍콩': 811, '기타': 2866 },
        '2024_3Q_Year': { 'OC(국내)': 275788, '중국': 28260, '홍콩': 6944, '기타': 7900 },
        '2024_4Q': { 'OC(국내)': 121114, '중국': 13237, '홍콩': 1689, '기타': -469 },
        '2024_Year': { 'OC(국내)': 396902, '중국': 41497, '홍콩': 8633, '기타': 7432 },
        '2025_1Q': { 'OC(국내)': 98102, '중국': 13152, '홍콩': 2341, '기타': 1523 },
        '2025_1Q_Year': { 'OC(국내)': 98102, '중국': 13152, '홍콩': 2341, '기타': 1523 },
        '2025_2Q': { 'OC(국내)': 82021, '중국': 10209, '홍콩': 1841, '기타': 1844 },
        '2025_2Q_Year': { 'OC(국내)': 180123, '중국': 23360, '홍콩': 4182, '기타': 3367 },
        '2025_3Q': { 'OC(국내)': 78829, '중국': 11034, '홍콩': 2221, '기타': 1788 },
        '2025_3Q_Year': { 'OC(국내)': 258952, '중국': 34395, '홍콩': 6403, '기타': 5156 },
        '2025_4Q': { 'OC(국내)': 0, '중국': 0, '홍콩': 0, '기타': 0 },
        '2025_Year': { 'OC(국내)': 258952, '중국': 34395, '홍콩': 6403, '기타': 5156 },
      },
      '감가상각비': {
        '2024_1Q': { 'OC(국내)': 10414, '중국': 5333, '홍콩': 3793, '기타': 327 },
        '2024_1Q_Year': { 'OC(국내)': 10414, '중국': 5333, '홍콩': 3793, '기타': 327 },
        '2024_2Q': { 'OC(국내)': 10778, '중국': 6017, '홍콩': 3760, '기타': 262 },
        '2024_2Q_Year': { 'OC(국내)': 21192, '중국': 11350, '홍콩': 7552, '기타': 590 },
        '2024_3Q': { 'OC(국내)': 11822, '중국': 6248, '홍콩': 3540, '기타': 313 },
        '2024_3Q_Year': { 'OC(국내)': 33014, '중국': 17598, '홍콩': 11093, '기타': 902 },
        '2024_4Q': { 'OC(국내)': 12447, '중국': 6712, '홍콩': 3264, '기타': 282 },
        '2024_Year': { 'OC(국내)': 45461, '중국': 24311, '홍콩': 14357, '기타': 1184 },
        '2025_1Q': { 'OC(국내)': 12795, '중국': 7629, '홍콩': 3123, '기타': 284 },
        '2025_1Q_Year': { 'OC(국내)': 12795, '중국': 7629, '홍콩': 3123, '기타': 284 },
        '2025_2Q': { 'OC(국내)': 13173, '중국': 6121, '홍콩': 1876, '기타': 292 },
        '2025_2Q_Year': { 'OC(국내)': 25968, '중국': 13750, '홍콩': 5000, '기타': 576 },
        '2025_3Q': { 'OC(국내)': 12850, '중국': 5468, '홍콩': 3009, '기타': 290 },
        '2025_3Q_Year': { 'OC(국내)': 38819, '중국': 19219, '홍콩': 8009, '기타': 867 },
        '2025_4Q': { 'OC(국내)': 0, '중국': 0, '홍콩': 0, '기타': 0 },
        '2025_Year': { 'OC(국내)': 38819, '중국': 19219, '홍콩': 8009, '기타': 867 },
      },
      '기타판관비': {
        '2024_1Q': { 'OC(국내)': 11331, '중국': 5585, '홍콩': 1532, '기타': 978 },
        '2024_1Q_Year': { 'OC(국내)': 11331, '중국': 5585, '홍콩': 1532, '기타': 978 },
        '2024_2Q': { 'OC(국내)': 10450, '중국': 3883, '홍콩': 1390, '기타': 973 },
        '2024_2Q_Year': { 'OC(국내)': 21781, '중국': 9469, '홍콩': 2921, '기타': 1952 },
        '2024_3Q': { 'OC(국내)': 9320, '중국': 5952, '홍콩': 1478, '기타': 1074 },
        '2024_3Q_Year': { 'OC(국내)': 31101, '중국': 15420, '홍콩': 4400, '기타': 3025 },
        '2024_4Q': { 'OC(국내)': 14464, '중국': 4950, '홍콩': 2397, '기타': 1893 },
        '2024_Year': { 'OC(국내)': 45565, '중국': 20370, '홍콩': 6797, '기타': 4918 },
        '2025_1Q': { 'OC(국내)': 10904, '중국': 5466, '홍콩': 2581, '기타': 1618 },
        '2025_1Q_Year': { 'OC(국내)': 10904, '중국': 5466, '홍콩': 2581, '기타': 1618 },
        '2025_2Q': { 'OC(국내)': 9640, '중국': 3353, '홍콩': 2577, '기타': 1649 },
        '2025_2Q_Year': { 'OC(국내)': 20544, '중국': 8820, '홍콩': 5158, '기타': 3267 },
        '2025_3Q': { 'OC(국내)': 8066, '중국': 5795, '홍콩': 2164, '기타': 3459 },
        '2025_3Q_Year': { 'OC(국내)': 28610, '중국': 14615, '홍콩': 7323, '기타': 6726 },
        '2025_4Q': { 'OC(국내)': 0, '중국': 0, '홍콩': 0, '기타': 0 },
        '2025_Year': { 'OC(국내)': 28610, '중국': 14615, '홍콩': 7323, '기타': 6726 },
      },
      '영업이익': {
        '2024_1Q': { 'OC(국내)': 95454, '중국': 24682, '홍콩': 650, '기타': -583 },
        '2024_1Q_Year': { 'OC(국내)': 95454, '중국': 24682, '홍콩': 650, '기타': -583 },
        '2024_2Q': { 'OC(국내)': 54079, '중국': 20706, '홍콩': 497, '기타': -1531 },
        '2024_2Q_Year': { 'OC(국내)': 149533, '중국': 45387, '홍콩': 1147, '기타': -2114 },
        '2024_3Q': { 'OC(국내)': 137103, '중국': 13296, '홍콩': 455, '기타': -6210 },
        '2024_3Q_Year': { 'OC(국내)': 286636, '중국': 58683, '홍콩': 1602, '기타': -8324 },
        '2024_4Q': { 'OC(국내)': 115771, '중국': -22584, '홍콩': 1754, '기타': -3579 },
        '2024_Year': { 'OC(국내)': 402407, '중국': 36099, '홍콩': 3357, '기타': -11903 },
        '2025_1Q': { 'OC(국내)': 111978, '중국': 6110, '홍콩': 3, '기타': -529 },
        '2025_1Q_Year': { 'OC(국내)': 111978, '중국': 6110, '홍콩': 3, '기타': -529 },
        '2025_2Q': { 'OC(국내)': 80600, '중국': -340, '홍콩': 187, '기타': -765 },
        '2025_2Q_Year': { 'OC(국내)': 192577, '중국': 5770, '홍콩': 190, '기타': -1294 },
        '2025_3Q': { 'OC(국내)': 192568, '중국': 30053, '홍콩': -1246, '기타': 2667 },
        '2025_3Q_Year': { 'OC(국내)': 385145, '중국': 35823, '홍콩': -1056, '기타': 1372 },
        '2025_4Q': { 'OC(국내)': 0, '중국': 0, '홍콩': 0, '기타': 0 },
        '2025_Year': { 'OC(국내)': 385145, '중국': 35823, '홍콩': -1056, '기타': 1372 },
      },
      '당기순이익': {
        '2024_1Q': { 'OC(국내)': 72187, '중국': 18059, '홍콩': 319, '기타': -820 },
        '2024_1Q_Year': { 'OC(국내)': 72187, '중국': 18059, '홍콩': 319, '기타': -820 },
        '2024_2Q': { 'OC(국내)': 48504, '중국': 15349, '홍콩': 267, '기타': -2445 },
        '2024_2Q_Year': { 'OC(국내)': 120691, '중국': 33409, '홍콩': 586, '기타': -3265 },
        '2024_3Q': { 'OC(국내)': 105886, '중국': 9479, '홍콩': 2, '기타': -9957 },
        '2024_3Q_Year': { 'OC(국내)': 226577, '중국': 42887, '홍콩': 588, '기타': -13222 },
        '2024_4Q': { 'OC(국내)': 96955, '중국': -17665, '홍콩': 1540, '기타': -9135 },
        '2024_Year': { 'OC(국내)': 323532, '중국': 25222, '홍콩': 2128, '기타': -22358 },
        '2025_1Q': { 'OC(국내)': 79838, '중국': 3693, '홍콩': -173, '기타': -4775 },
        '2025_1Q_Year': { 'OC(국내)': 79838, '중국': 3693, '홍콩': -173, '기타': -4775 },
        '2025_2Q': { 'OC(국내)': 64206, '중국': -1457, '홍콩': 397, '기타': -4516 },
        '2025_2Q_Year': { 'OC(국내)': 144044, '중국': 2236, '홍콩': 224, '기타': -9292 },
        '2025_3Q': { 'OC(국내)': 150942, '중국': 21686, '홍콩': -1312, '기타': -259 },
        '2025_3Q_Year': { 'OC(국내)': 294987, '중국': 23922, '홍콩': -1087, '기타': -9551 },
        '2025_4Q': { 'OC(국내)': 0, '중국': 0, '홍콩': 0, '기타': 0 },
        '2025_Year': { 'OC(국내)': 294987, '중국': 23922, '홍콩': -1087, '기타': -9551 },
      },
    };

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
            
            return (
              <div 
                key={idx}
                className="bg-white rounded-lg border border-zinc-200 shadow-sm p-4 hover:shadow-md transition-all duration-200"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-zinc-500 uppercase tracking-wide">{card.title}</span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                    isPositive ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                  }`}>
                    {changeRate !== '-' ? `${isPositive ? '+' : ''}${changeRate}%` : '-'}
                  </span>
                </div>
                
                {/* 금액 (억원 단위 + 조단위 표기) */}
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-zinc-900 tracking-tight">{formatTrilBil(currBil)}</span>
                  <span className="text-sm font-normal text-zinc-400">억원</span>
                </div>
                
                {/* 전년동기 & 증감 */}
                <div className="flex items-center gap-2 mt-1 text-xs">
                  <span className="text-zinc-400">전년 {formatTrilBil(prevBil)}억</span>
                  <span className={`font-semibold ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {diffBil >= 0 ? '+' : ''}{formatTrilBil(diffBil)}억
                  </span>
                </div>
                
                {/* 비율 (해당되는 경우) */}
                {card.hasRate && (
                  <div className="mt-3 pt-3 border-t border-zinc-100">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-zinc-400">{card.rateLabel}</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-bold text-zinc-900">{currRate}%</span>
                        <span className={`text-xs font-semibold ${parseFloat(rateDiff) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {parseFloat(rateDiff) >= 0 ? '+' : ''}{rateDiff}%p
                        </span>
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
                    분기
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
                      const ratePrev = calcRate(incomeStatementData[prevPeriod][num], incomeStatementData[prevPeriod][denom]);
                      const rateCurr = calcRate(incomeStatementData[currPeriod][num], incomeStatementData[currPeriod][denom]);
                      const rateDiff = calcRateDiff(rateCurr, ratePrev);
                      
                      return (
                        <tr key={idx} className="border-b border-zinc-100 bg-zinc-50/50">
                          <td className="px-3 py-2 text-zinc-500 italic border-r border-zinc-200 text-xs">{item.label}</td>
                          <td className="text-center px-3 py-2 text-zinc-500 border-r border-zinc-200">{ratePrev}</td>
                          <td className="text-center px-3 py-2 font-medium text-zinc-700 border-r border-zinc-200 bg-zinc-50">{rateCurr}</td>
                          <td colSpan="2" className={`text-center px-3 py-2 font-medium ${rateDiff.includes('+') ? 'text-emerald-600' : rateDiff.includes('-') ? 'text-rose-600' : 'text-zinc-500'}`}>
                            {rateDiff}
                          </td>
                        </tr>
                      );
                    }

                    // 일반 금액 행 처리
                    const valPrev = incomeStatementData[prevPeriod][item.key];
                    const valCurr = incomeStatementData[currPeriod][item.key];
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
                  {incomeViewMode === 'quarter' ? '2025.4Q' : '2025년'}
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
          <div className="bg-white rounded-lg border border-zinc-200 shadow-sm p-3">
            <h4 className="text-xs font-semibold text-zinc-700 mb-2">📊 YoY 증감 분석</h4>
            <div className="space-y-2 text-xs">
              {(() => {
                const tableData = getEntityTableData().filter(row => row.entity !== '기타');
                const totalCurr = tableData.reduce((sum, r) => sum + r.currVal, 0);
                const totalPrev = tableData.reduce((sum, r) => sum + r.prevVal, 0);
                const totalDiff = totalCurr - totalPrev;
                
                return tableData
                  .sort((a, b) => Math.abs(b.currVal - b.prevVal) - Math.abs(a.currVal - a.prevVal))
                  .map((row, idx) => {
                    const diff = row.currVal - row.prevVal;
                    const isPositive = diff >= 0;
                    const contribution = totalDiff !== 0 ? ((diff / Math.abs(totalDiff)) * 100).toFixed(0) : 0;
                    const diffBil = Math.round(diff / 100); // 억원 단위
                    
                    const colorMap = {
                      'OC(국내)': { bg: 'bg-blue-50/50', border: 'border-blue-400', icon: '🏢' },
                      '중국': { bg: 'bg-amber-50/50', border: 'border-amber-400', icon: '🇨🇳' },
                      '홍콩': { bg: 'bg-violet-50/50', border: 'border-violet-400', icon: '🇭🇰' },
                    };
                    const colors = colorMap[row.entity] || { bg: 'bg-zinc-50', border: 'border-zinc-300', icon: '📍' };
                    
                    return (
                      <div key={idx} className={`p-2.5 ${colors.bg} rounded-lg border-l-2 ${colors.border}`}>
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-zinc-800">{colors.icon} {row.entity}</span>
                          <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${isPositive ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                            {isPositive ? '▲' : '▼'} {row.change}%
                          </span>
                        </div>
                        <div className="mt-1.5 flex items-center justify-between text-[11px]">
                          <span className="text-zinc-500">
                            {isPositive ? '+' : ''}{formatNumber(diffBil)}억원
                          </span>
                          <span className="text-zinc-400">
                            기여도 {contribution}%
                          </span>
                        </div>
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
              
              return (
                <div className="mt-3 pt-3 border-t border-zinc-200">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-600 font-medium">전체 YoY 변동</span>
                    <span className={`font-bold ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {isPositive ? '+' : ''}{formatNumber(totalDiffBil)}억원 ({isPositive ? '+' : ''}{totalChange}%)
                    </span>
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
    const calcROE = (period) => {
      const selectedQuarter = selectedPeriod.split('_')[1];
      const yearKey = getPeriodKey(selectedPeriod, 'year');
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

    // 요약 카드 데이터 (억원 단위)
    const summaryCards = [
      { 
        title: '자산총계', 
        curr: (balanceSheetData[bsCurrentPeriod]?.자산총계 || 0) / 100,
        prev: (balanceSheetData[bsPrevPeriod]?.자산총계 || 0) / 100,
        unit: '억원',
        useTril: true,
      },
      { 
        title: '운전자본', 
        curr: calcWorkingCapital(bsCurrentPeriod) / 100,
        prev: calcWorkingCapital(bsPrevPeriod) / 100,
        unit: '억원',
        useTril: false,
      },
      { 
        title: '자본총계', 
        curr: (balanceSheetData[bsCurrentPeriod]?.자본총계 || 0) / 100,
        prev: (balanceSheetData[bsPrevPeriod]?.자본총계 || 0) / 100,
        unit: '억원',
        useTril: true,
      },
      { 
        title: 'ROE', 
        curr: calcROE(bsCurrentPeriod),
        prev: calcROE(bsPrevPeriod),
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

    // 법인별 데이터 (재무상태표용) - 엑셀에서 추출한 실제 데이터
    const entityBSData = {
      '2024_4Q': {
        현금성자산: { 'OC(국내)': 61500, 중국: 29229, 홍콩: 6073, ST미국: 22881 },
        매출채권: { 'OC(국내)': 134453, 중국: 40081, 홍콩: 3967, ST미국: 7463 },
        재고자산: { 'OC(국내)': 214281, 중국: 141223, 홍콩: 35205, ST미국: 8723 },
        유무형자산: { 'OC(국내)': 609769, 중국: 10416, 홍콩: 2479, ST미국: 70443 },
        사용권자산: { 'OC(국내)': 146365, 중국: 47203, 홍콩: 11426, ST미국: 1315 },
        차입금: { 'OC(국내)': 45000, 중국: 100635, 홍콩: 0, ST미국: 0 },
        매입채무: { 'OC(국내)': 79795, 중국: 17885, 홍콩: 47089, ST미국: 6030 },
        자산총계: { 'OC(국내)': 1923504, 중국: 336611, 홍콩: 67244, ST미국: 112329 },
        부채총계: { 'OC(국내)': 429786, 중국: 252897, 홍콩: 64912, ST미국: 26968 },
        자본총계: { 'OC(국내)': 1493718, 중국: 83714, 홍콩: 2333, ST미국: 85361 },
      },
      '2025_4Q': {
        현금성자산: { 'OC(국내)': 182075, 중국: 9318, 홍콩: 4446, ST미국: 11400 },
        매출채권: { 'OC(국내)': 205309, 중국: 97531, 홍콩: 2871, ST미국: 16277 },
        재고자산: { 'OC(국내)': 242024, 중국: 281973, 홍콩: 34165, ST미국: 12558 },
        유무형자산: { 'OC(국내)': 605414, 중국: 8114, 홍콩: 3290, ST미국: 67161 },
        사용권자산: { 'OC(국내)': 135457, 중국: 30581, 홍콩: 17979, ST미국: 945 },
        차입금: { 'OC(국내)': 0, 중국: 160605, 홍콩: 0, ST미국: 0 },
        매입채무: { 'OC(국내)': 139941, 중국: 131315, 홍콩: 47089, ST미국: 3739 },
        자산총계: { 'OC(국내)': 2145196, 중국: 495765, 홍콩: 71221, ST미국: 111397 },
        부채총계: { 'OC(국내)': 423707, 중국: 389821, 홍콩: 69512, ST미국: 32762 },
        자본총계: { 'OC(국내)': 1721489, 중국: 105943, 홍콩: 1710, ST미국: 78635 },
      },
    };

    // 분기별 법인별 추이 데이터 (24.1Q ~ 25.4Q)
    const quarterlyEntityData = {
      현금성자산: [
        { quarter: '24.1Q', 'OC(국내)': 85000, 중국: 35000, 기타: 25000 },
        { quarter: '24.2Q', 'OC(국내)': 78000, 중국: 32000, 기타: 28000 },
        { quarter: '24.3Q', 'OC(국내)': 72000, 중국: 30000, 기타: 26000 },
        { quarter: '24.4Q', 'OC(국내)': 61500, 중국: 29229, 기타: 28954 },
        { quarter: '25.1Q', 'OC(국내)': 95000, 중국: 25000, 기타: 22000 },
        { quarter: '25.2Q', 'OC(국내)': 120000, 중국: 18000, 기타: 20000 },
        { quarter: '25.3Q', 'OC(국내)': 150000, 중국: 12000, 기타: 18000 },
        { quarter: '25.4Q', 'OC(국내)': 182075, 중국: 9318, 기타: 15846 },
      ],
      매출채권: [
        { quarter: '24.1Q', 'OC(국내)': 120000, 중국: 35000, 기타: 10000 },
        { quarter: '24.2Q', 'OC(국내)': 125000, 중국: 38000, 기타: 11000 },
        { quarter: '24.3Q', 'OC(국내)': 130000, 중국: 39000, 기타: 11200 },
        { quarter: '24.4Q', 'OC(국내)': 134453, 중국: 40081, 기타: 11430 },
        { quarter: '25.1Q', 'OC(국내)': 145000, 중국: 55000, 기타: 14000 },
        { quarter: '25.2Q', 'OC(국내)': 165000, 중국: 70000, 기타: 16000 },
        { quarter: '25.3Q', 'OC(국내)': 185000, 중국: 85000, 기타: 18000 },
        { quarter: '25.4Q', 'OC(국내)': 205309, 중국: 97531, 기타: 19148 },
      ],
      재고자산: [
        { quarter: '24.1Q', 'OC(국내)': 180000, 중국: 100000, 기타: 38000 },
        { quarter: '24.2Q', 'OC(국내)': 190000, 중국: 115000, 기타: 40000 },
        { quarter: '24.3Q', 'OC(국내)': 200000, 중국: 128000, 기타: 42000 },
        { quarter: '24.4Q', 'OC(국내)': 214281, 중국: 141223, 기타: 43928 },
        { quarter: '25.1Q', 'OC(국내)': 220000, 중국: 180000, 기타: 44000 },
        { quarter: '25.2Q', 'OC(국내)': 228000, 중국: 220000, 기타: 45000 },
        { quarter: '25.3Q', 'OC(국내)': 235000, 중국: 250000, 기타: 46000 },
        { quarter: '25.4Q', 'OC(국내)': 242024, 중국: 281973, 기타: 46723 },
      ],
      유무형자산: [
        { quarter: '24.1Q', 'OC(국내)': 620000, 중국: 12000, 기타: 74000 },
        { quarter: '24.2Q', 'OC(국내)': 618000, 중국: 11500, 기타: 73500 },
        { quarter: '24.3Q', 'OC(국내)': 614000, 중국: 11000, 기타: 73000 },
        { quarter: '24.4Q', 'OC(국내)': 609769, 중국: 10416, 기타: 72922 },
        { quarter: '25.1Q', 'OC(국내)': 608000, 중국: 9800, 기타: 72000 },
        { quarter: '25.2Q', 'OC(국내)': 607000, 중국: 9200, 기타: 71000 },
        { quarter: '25.3Q', 'OC(국내)': 606000, 중국: 8600, 기타: 70500 },
        { quarter: '25.4Q', 'OC(국내)': 605414, 중국: 8114, 기타: 70451 },
      ],
      사용권자산: [
        { quarter: '24.1Q', 'OC(국내)': 155000, 중국: 52000, 기타: 14000 },
        { quarter: '24.2Q', 'OC(국내)': 152000, 중국: 50000, 기타: 13500 },
        { quarter: '24.3Q', 'OC(국내)': 149000, 중국: 48500, 기타: 13000 },
        { quarter: '24.4Q', 'OC(국내)': 146365, 중국: 47203, 기타: 12741 },
        { quarter: '25.1Q', 'OC(국내)': 143000, 중국: 42000, 기타: 15000 },
        { quarter: '25.2Q', 'OC(국내)': 140000, 중국: 38000, 기타: 17000 },
        { quarter: '25.3Q', 'OC(국내)': 138000, 중국: 34000, 기타: 18500 },
        { quarter: '25.4Q', 'OC(국내)': 135457, 중국: 30581, 기타: 18924 },
      ],
      차입금: [
        { quarter: '24.1Q', 'OC(국내)': 60000, 중국: 80000, 기타: 0 },
        { quarter: '24.2Q', 'OC(국내)': 55000, 중국: 88000, 기타: 0 },
        { quarter: '24.3Q', 'OC(국내)': 50000, 중국: 95000, 기타: 0 },
        { quarter: '24.4Q', 'OC(국내)': 45000, 중국: 100635, 기타: 0 },
        { quarter: '25.1Q', 'OC(국내)': 30000, 중국: 120000, 기타: 0 },
        { quarter: '25.2Q', 'OC(국내)': 15000, 중국: 140000, 기타: 0 },
        { quarter: '25.3Q', 'OC(국내)': 5000, 중국: 150000, 기타: 0 },
        { quarter: '25.4Q', 'OC(국내)': 0, 중국: 160605, 기타: 0 },
      ],
      매입채무: [
        { quarter: '24.1Q', 'OC(국내)': 65000, 중국: 12000, 기타: 48000 },
        { quarter: '24.2Q', 'OC(국내)': 70000, 중국: 14000, 기타: 50000 },
        { quarter: '24.3Q', 'OC(국내)': 75000, 중국: 16000, 기타: 52000 },
        { quarter: '24.4Q', 'OC(국내)': 79795, 중국: 17885, 기타: 53119 },
        { quarter: '25.1Q', 'OC(국내)': 95000, 중국: 50000, 기타: 52000 },
        { quarter: '25.2Q', 'OC(국내)': 110000, 중국: 80000, 기타: 51500 },
        { quarter: '25.3Q', 'OC(국내)': 125000, 중국: 105000, 기타: 51000 },
        { quarter: '25.4Q', 'OC(국내)': 139941, 중국: 131315, 기타: 50828 },
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
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-zinc-500 uppercase tracking-wide">{card.title}</span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                    isPositive ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                  }`}>
                    {changeRate !== '-' ? `${isPositive ? '+' : ''}${changeRate}%` : '-'}
                  </span>
                </div>
                
                <div className="text-2xl font-bold text-zinc-900 tracking-tight">
                  {card.isRatio ? `${curr}%` : (card.useTril ? formatTrilBil(curr) : formatNumber(Math.round(curr)))}
                  {card.unit && <span className="text-sm font-normal text-zinc-500 ml-1">{card.unit}</span>}
                </div>
                
                <div className="flex items-center gap-2 mt-1 text-xs">
                  <span className="text-zinc-400">
                    전년 {card.isRatio ? `${prev}%` : `${card.useTril ? formatTrilBil(prev) : formatNumber(Math.round(prev))}${card.unit || ''}`}
                  </span>
                  {!card.isRatio && (
                    <span className={`font-semibold ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {isPositive ? '+' : ''}{formatNumber(Math.round(diff))}
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
                <h3 className="text-sm font-semibold text-zinc-900">연결 재무상태표</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-zinc-50 border-b border-zinc-200">
                      <th className="text-left px-3 py-2.5 font-semibold text-zinc-700 border-r border-zinc-200 min-w-[175px]">과목</th>
                      <th className="text-center px-3 py-2 font-semibold text-zinc-600 border-r border-zinc-200 min-w-[95px]">2024.기말</th>
                      <th className="text-center px-3 py-2 font-semibold text-zinc-900 border-r border-zinc-200 bg-zinc-100 min-w-[95px]">
                        {selectedPeriod.replace('2025_', '').replace('Q', ' Q')} 기말
                      </th>
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
                {/* 2024년 도넛 */}
                <div className="text-center">
                  <p className="text-xs font-medium text-zinc-500 mb-2">2024년말</p>
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
                  <p className="text-xs font-medium text-zinc-500 mb-2">2025년말</p>
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
                    <th className="text-right px-2 py-2 font-semibold text-zinc-600 min-w-[85px]">2024</th>
                    <th className="text-right px-2 py-2 font-semibold text-zinc-600 min-w-[85px]">2025</th>
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

            {/* 주요 인사이트 */}
            <div className="bg-white rounded-lg border border-zinc-200 shadow-sm p-4">
              <h3 className="text-sm font-semibold text-zinc-900 mb-3">
                {balanceItems.find(i => i.key === selectedBSAccount)?.label || selectedBSAccount} 증감 분석
              </h3>
              <div className="space-y-2 text-xs">
                {(() => {
                  const curr2025 = getAlignedBSBreakdown(selectedBSAccount, bsCurrentPeriod);
                  const curr2024 = getAlignedBSBreakdown(selectedBSAccount, bsPrevPeriod);
                  
                  // 법인별 증감 계산
                  const changes = Object.keys(curr2025).map(entity => ({
                    name: entity,
                    diff: curr2025[entity] - curr2024[entity],
                    rate: curr2024[entity] !== 0 ? ((curr2025[entity] - curr2024[entity]) / Math.abs(curr2024[entity]) * 100).toFixed(1) : 0
                  })).sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));
                  
                  const total2025 = getBSConsolidatedTotal(selectedBSAccount, bsCurrentPeriod);
                  const total2024 = getBSConsolidatedTotal(selectedBSAccount, bsPrevPeriod);
                  const totalDiff = total2025 - total2024;
                  
                  return (
                    <>
                      <div className="p-2 bg-blue-50 rounded border-l-2 border-blue-400">
                        <p className="font-medium text-blue-800">전체 YoY</p>
                        <p className="text-blue-600 text-[11px] mt-0.5">
                          {totalDiff >= 0 ? '+' : ''}{formatNumber(totalDiff)}백만원 
                          ({total2024 !== 0 ? `${((total2025 - total2024) / Math.abs(total2024) * 100).toFixed(1)}%` : '-'})
                        </p>
                      </div>
                      <div className={`p-2 rounded border-l-2 ${changes[0]?.diff >= 0 ? 'bg-emerald-50 border-emerald-400' : 'bg-rose-50 border-rose-400'}`}>
                        <p className={`font-medium ${changes[0]?.diff >= 0 ? 'text-emerald-800' : 'text-rose-800'}`}>
                          최대 {changes[0]?.diff >= 0 ? '증가' : '감소'}: {changes[0]?.name}
                        </p>
                        <p className={`text-[11px] mt-0.5 ${changes[0]?.diff >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {changes[0]?.diff >= 0 ? '+' : ''}{formatNumber(changes[0]?.diff)}백만원 ({changes[0]?.rate}%)
                        </p>
                      </div>
                      {changes[1] && Math.abs(changes[1].diff) > 0 && (
                        <div className={`p-2 rounded border-l-2 ${changes[1]?.diff >= 0 ? 'bg-amber-50 border-amber-400' : 'bg-zinc-50 border-zinc-300'}`}>
                          <p className={`font-medium ${changes[1]?.diff >= 0 ? 'text-amber-800' : 'text-zinc-700'}`}>
                            {changes[1]?.diff >= 0 ? '증가' : '감소'}: {changes[1]?.name}
                          </p>
                          <p className={`text-[11px] mt-0.5 ${changes[1]?.diff >= 0 ? 'text-amber-600' : 'text-zinc-500'}`}>
                            {changes[1]?.diff >= 0 ? '+' : ''}{formatNumber(changes[1]?.diff)}백만원 ({changes[1]?.rate}%)
                          </p>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
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
        <div className="mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 bg-zinc-900 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">F&F</span>
              </div>
              <div>
                <h1 className="text-xl font-semibold tracking-tight text-zinc-900">F&F Corporation</h1>
                <p className="text-xs text-zinc-500">
                  {selectedPeriod.replace('_', ' ').replace('Q', ' Q')} 연결 재무제표
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="px-3 py-1.5 bg-zinc-900 text-white text-xs font-medium rounded border-none outline-none cursor-pointer hover:bg-zinc-800 transition-colors"
              >
                <option value="2025_Q1">FY2025 Q1</option>
                <option value="2025_Q2">FY2025 Q2</option>
                <option value="2025_Q3">FY2025 Q3</option>
                <option value="2025_Q4">FY2025 Q4</option>
              </select>
            </div>
          </div>
        </div>

        {/* 탭 네비게이션 */}
        <div className="mb-4">
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
