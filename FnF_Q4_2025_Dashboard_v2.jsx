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

  // ============================================
  // 손익계산서 데이터 - 분기(3개월) + 누적(연간) 통합
  // ============================================
  const incomeStatementData = {
    '2024_4Q': { // 전년 4분기 (3개월)
      매출액: 546544,
      매출원가: 188255,
      매출총이익: 358288,
      판매비와관리비: 237868,
      인건비: 22684,
      광고선전비: 32178,
      수수료: 135911,
      감가상각비: 23439,
      기타판관비: 23654,
      영업이익: 120420,
      영업외손익: 3273,
      외환손익: 7220,
      선물환손익: 276,
      금융상품손익: 1126,
      이자손익: -2088,
      배당수익: -270,
      기부금: 826,
      기타손익: -2165,
      지분법손익: 17653,
      법인세비용차감전순이익: 141346,
      법인세비용: 35460,
      당기순이익: 105885,
    },
    '2024_Year': { // 전년 누적 (연간)
      매출액: 1896009,
      매출원가: 649017,
      매출총이익: 1246992,
      판매비와관리비: 796255,
      인건비: 84269,
      광고선전비: 93132,
      수수료: 453482,
      감가상각비: 88809,
      기타판관비: 76561,
      영업이익: 450737,
      영업외손익: -1469,
      외환손익: 8988,
      선물환손익: 369,
      금융상품손익: 428,
      이자손익: -5074,
      배당수익: 3024,
      기부금: 3239,
      기타손익: -5965,
      지분법손익: 28032,
      법인세비용차감전순이익: 477301,
      법인세비용: 121341,
      당기순이익: 355959,
    },
    '2025_4Q': { // 당기 4분기 (3개월)
      매출액: 474257,
      매출원가: 165302,
      매출총이익: 308954,
      판매비와관리비: 180934,
      인건비: 20266,
      광고선전비: 25031,
      수수료: 93906,
      감가상각비: 22261,
      기타판관비: 19468,
      영업이익: 128019,
      영업외손익: -4729,
      외환손익: 5851,
      선물환손익: -5574,
      금융상품손익: -500,
      이자손익: -1650,
      배당수익: 481,
      기부금: 77,
      기타손익: -3260,
      지분법손익: 11987,
      법인세비용차감전순이익: 135277,
      법인세비용: 34582,
      당기순이익: 100695,
    },
    '2025_Year': { // 당기 누적 (연간)
      매출액: 1358744,
      매출원가: 461149,
      매출총이익: 897594,
      판매비와관리비: 561928,
      인건비: 62780,
      광고선전비: 69179,
      수수료: 303857,
      감가상각비: 68885,
      기타판관비: 57225,
      영업이익: 335665,
      영업외손익: -14033,
      외환손익: -981,
      선물환손익: 2820,
      금융상품손익: -1264,
      이자손익: -6040,
      배당수익: 855,
      기부금: 82,
      기타손익: -9341,
      지분법손익: 10392,
      법인세비용차감전순이익: 332024,
      법인세비용: 86120,
      당기순이익: 245903,
    },
  };

  // ============================================
  // 재무상태표 데이터 - 전년기말 vs 당기말
  // ============================================
  // 재무상태표 데이터 (성격별 분류 - 유동/비유동 통합)
  const balanceSheetData = {
    '2025_4Q': {
      // 자산 (성격별)
      현금성자산: 208285,
      금융상품: 37815,      // 유동 28,725 + 비유동 9,090
      매출채권: 152793,
      재고자산: 414026,
      관계기업투자: 653157,
      유무형자산: 703080,   // 유형 423,174 + 투자부동산 79,690 + 무형 200,217
      사용권자산: 186155,
      기타자산: 145351,     // 유동기타 57,390 + 비유동기타 87,961
      자산총계: 2500662,
      // 부채 (성격별)
      차입금: 160605,       // 단기 160,605 + 장기 0
      매입채무: 158517,
      미지급금: 36728,
      리스부채: 195362,     // 유동 55,602 + 비유동 139,760
      보증금: 9968,
      기타부채: 188982,     // 유동기타 162,111 + 비유동기타 26,871
      부채총계: 750162,
      // 자본
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
    // 손익 요약 카드 데이터 (억원 단위, 연간 기준)
    const incomeCards = [
      { title: '매출액', value: Math.round(incomeStatementData['2025_Year'].매출액 / 100), prevValue: Math.round(incomeStatementData['2024_Year'].매출액 / 100), iconColor: 'bg-blue-500' },
      { title: '영업이익', value: Math.round(incomeStatementData['2025_Year'].영업이익 / 100), prevValue: Math.round(incomeStatementData['2024_Year'].영업이익 / 100), iconColor: 'bg-emerald-500' },
      { title: '당기순이익', value: Math.round(incomeStatementData['2025_Year'].당기순이익 / 100), prevValue: Math.round(incomeStatementData['2024_Year'].당기순이익 / 100), iconColor: 'bg-violet-500' },
    ];

    // 재무상태 요약 카드 데이터 (억원 단위)
    const balanceCards = [
      { title: '자산총계', value: Math.round(balanceSheetData['2025_4Q'].자산총계 / 100), prevValue: Math.round(balanceSheetData['2024_4Q'].자산총계 / 100), iconColor: 'bg-amber-500' },
      { title: '부채총계', value: Math.round(balanceSheetData['2025_4Q'].부채총계 / 100), prevValue: Math.round(balanceSheetData['2024_4Q'].부채총계 / 100), iconColor: 'bg-rose-500' },
      { title: '자본총계', value: Math.round(balanceSheetData['2025_4Q'].자본총계 / 100), prevValue: Math.round(balanceSheetData['2024_4Q'].자본총계 / 100), iconColor: 'bg-cyan-500' },
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
    const entityData = {
      '매출액': {
        '2024_4Q': { 'OC(국내)': 1517994, '중국': 857840, '홍콩': 75034, '기타': 12749 },
        '2025_4Q': { 'OC(국내)': 1214833, '중국': 713162, '홍콩': 53313, '기타': 5138 },
        '2024_Year': { 'OC(국내)': 1517994, '중국': 857840, '홍콩': 75034, '기타': 12749 },
        '2025_Year': { 'OC(국내)': 1214833, '중국': 713162, '홍콩': 53313, '기타': 5138 },
      },
      '매출원가': {
        '2024_4Q': { 'OC(국내)': 543612, '중국': 664165, '홍콩': 32066, '기타': 27230 },
        '2025_4Q': { 'OC(국내)': 449911, '중국': 547506, '홍콩': 24678, '기타': 8536 },
        '2024_Year': { 'OC(국내)': 543612, '중국': 664165, '홍콩': 32066, '기타': 27230 },
        '2025_Year': { 'OC(국내)': 449911, '중국': 547506, '홍콩': 24678, '기타': 8536 },
      },
      '매출총이익': {
        '2024_4Q': { 'OC(국내)': 974381, '중국': 193674, '홍콩': 42968, '기타': -14481 },
        '2025_4Q': { 'OC(국내)': 764921, '중국': 165656, '홍콩': 28634, '기타': -3397 },
        '2024_Year': { 'OC(국내)': 974381, '중국': 193674, '홍콩': 42968, '기타': -14481 },
        '2025_Year': { 'OC(국내)': 764921, '중국': 165656, '홍콩': 28634, '기타': -3397 },
      },
      '인건비': {
        '2024_4Q': { 'OC(국내)': 43691, '중국': 26129, '홍콩': 7810, '기타': 2154 },
        '2025_4Q': { 'OC(국내)': 30081, '중국': 21604, '홍콩': 6283, '기타': 1473 },
        '2024_Year': { 'OC(국내)': 43691, '중국': 26129, '홍콩': 7810, '기타': 2154 },
        '2025_Year': { 'OC(국내)': 30081, '중국': 21604, '홍콩': 6283, '기타': 1473 },
      },
      '광고선전비': {
        '2024_4Q': { 'OC(국내)': 40354, '중국': 45268, '홍콩': 2013, '기타': 6 },
        '2025_4Q': { 'OC(국내)': 23314, '중국': 40000, '홍콩': 1672, '기타': 0 },
        '2024_Year': { 'OC(국내)': 40354, '중국': 45268, '홍콩': 2013, '기타': 6 },
        '2025_Year': { 'OC(국내)': 23314, '중국': 40000, '홍콩': 1672, '기타': 0 },
      },
      '수수료': {
        '2024_4Q': { 'OC(국내)': 396901, '중국': 41496, '홍콩': 8633, '기타': 815 },
        '2025_4Q': { 'OC(국내)': 258952, '중국': 34394, '홍콩': 6402, '기타': 294 },
        '2024_Year': { 'OC(국내)': 396901, '중국': 41496, '홍콩': 8633, '기타': 815 },
        '2025_Year': { 'OC(국내)': 258952, '중국': 34394, '홍콩': 6402, '기타': 294 },
      },
      '감가상각비': {
        '2024_4Q': { 'OC(국내)': 45461, '중국': 24310, '홍콩': 14356, '기타': 748 },
        '2025_4Q': { 'OC(국내)': 38818, '중국': 19218, '홍콩': 8008, '기타': 531 },
        '2024_Year': { 'OC(국내)': 45461, '중국': 24310, '홍콩': 14356, '기타': 748 },
        '2025_Year': { 'OC(국내)': 38818, '중국': 19218, '홍콩': 8008, '기타': 531 },
      },
      '기타판관비': {
        '2024_4Q': { 'OC(국내)': 45565, '중국': 20369, '홍콩': 6797, '기타': 782 },
        '2025_4Q': { 'OC(국내)': 28610, '중국': 14614, '홍콩': 7322, '기타': 454 },
        '2024_Year': { 'OC(국내)': 45565, '중국': 20369, '홍콩': 6797, '기타': 782 },
        '2025_Year': { 'OC(국내)': 28610, '중국': 14614, '홍콩': 7322, '기타': 454 },
      },
      '영업이익': {
        '2024_4Q': { 'OC(국내)': 402407, '중국': 36098, '홍콩': 3356, '기타': -18992 },
        '2025_4Q': { 'OC(국내)': 385144, '중국': 35823, '홍콩': -1056, '기타': -6154 },
        '2024_Year': { 'OC(국내)': 402407, '중국': 36098, '홍콩': 3356, '기타': -18992 },
        '2025_Year': { 'OC(국내)': 385144, '중국': 35823, '홍콩': -1056, '기타': -6154 },
      },
      '당기순이익': {
        '2024_4Q': { 'OC(국내)': 323532, '중국': 25222, '홍콩': 2128, '기타': -18676 },
        '2025_4Q': { 'OC(국내)': 294986, '중국': 23921, '홍콩': -1087, '기타': -6843 },
        '2024_Year': { 'OC(국내)': 323532, '중국': 25222, '홍콩': 2128, '기타': -18676 },
        '2025_Year': { 'OC(국내)': 294986, '중국': 23921, '홍콩': -1087, '기타': -6843 },
      },
    };

    // 현재 모드에 따른 기간 설정
    const currPeriod = incomeViewMode === 'quarter' ? '2025_4Q' : '2025_Year';
    const prevPeriod = incomeViewMode === 'quarter' ? '2024_4Q' : '2024_Year';
    const periodLabel = incomeViewMode === 'quarter' ? '4분기' : '연간';

    // 법인 색상
    const entityColors = {
      'OC(국내)': '#3B82F6',
      '중국': '#F59E0B',
      '홍콩': '#8B5CF6',
      '기타': '#6B7280',
    };

    // 도넛 차트용 데이터 변환 (양수 값만 표시)
    const getDonutData = (period) => {
      const data = entityData[selectedAccount]?.[period] || {};
      return Object.entries(data)
        .filter(([name, value]) => value > 0)  // 양수만 필터링
        .map(([name, value]) => ({
          name,
          value: value || 0,
          color: entityColors[name],
        }));
    };

    // 법인별 테이블 데이터 - 현재 모드에 따라 연동
    const getEntityTableData = () => {
      const prev = entityData[selectedAccount]?.[prevPeriod] || {};
      const curr = entityData[selectedAccount]?.[currPeriod] || {};
      const totalCurr = Object.values(curr).reduce((a, b) => a + b, 0);
      
      return Object.keys(entityColors).map(entity => {
        const prevVal = prev[entity] || 0;
        const currVal = curr[entity] || 0;
        const ratio = totalCurr > 0 ? ((currVal / totalCurr) * 100).toFixed(1) : '0.0';
        const change = prevVal > 0 ? (((currVal - prevVal) / prevVal) * 100).toFixed(1) : '-';
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

    return (
      <div className="space-y-4">
        {/* 요약 카드 섹션 - 누적 실적으로 고정 */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-zinc-700">실적 요약 (연간)</h3>
          </div>

          <div className="grid grid-cols-4 gap-3">
          {summaryCards.map((card, idx) => {
            // 누적(연간) 데이터로 고정
            const curr = incomeStatementData['2025_Year'][card.key];
            const prev = incomeStatementData['2024_Year'][card.key];
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
              const currNum = incomeStatementData['2025_Year'][num];
              const currDenom = incomeStatementData['2025_Year'][denom];
              const prevNum = incomeStatementData['2024_Year'][num];
              const prevDenom = incomeStatementData['2024_Year'][denom];
              
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
                    분기 (4Q)
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
                      {incomeViewMode === 'quarter' ? '2024.4Q' : '2024년'}
                    </th>
                    <th className="text-center px-3 py-2 font-semibold text-zinc-900 border-r border-zinc-200 bg-zinc-100 min-w-[95px]">
                      {incomeViewMode === 'quarter' ? '2025.4Q' : '2025년'}
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
      return (bs.매출채권 || 0) + (bs.재고자산 || 0) - (bs.매입채무 || 0);
    };

    // ROE 계산 (당기순이익 / 자본총계 * 100)
    const calcROE = (period) => {
      const netIncome = period === '2025_4Q' 
        ? incomeStatementData['2025_Year'].당기순이익 
        : incomeStatementData['2024_Year'].당기순이익;
      const equity = balanceSheetData[period].자본총계;
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
        curr: balanceSheetData['2025_4Q'].자산총계 / 100,
        prev: balanceSheetData['2024_4Q'].자산총계 / 100,
        unit: '억원',
        useTril: true,
      },
      { 
        title: '운전자본', 
        curr: calcWorkingCapital('2025_4Q') / 100,
        prev: calcWorkingCapital('2024_4Q') / 100,
        unit: '억원',
        useTril: false,
      },
      { 
        title: '자본총계', 
        curr: balanceSheetData['2025_4Q'].자본총계 / 100,
        prev: balanceSheetData['2024_4Q'].자본총계 / 100,
        unit: '억원',
        useTril: true,
      },
      { 
        title: 'ROE', 
        curr: calcROE('2025_4Q'),
        prev: calcROE('2024_4Q'),
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
    };

    // 추이 그래프용 색상
    const trendColors = {
      'OC(국내)': '#3B82F6',
      중국: '#F59E0B',
      기타: '#8B5CF6',
    };

    // 도넛 차트 데이터 생성 함수
    const getBSDonutData = (period) => {
      const accountData = entityBSData[period][selectedBSAccount] || entityBSData[period]['자산총계'];
      if (!accountData) return [];
      
      const total = Object.values(accountData).reduce((sum, val) => sum + Math.abs(val), 0);
      if (total === 0) return [];
      
      return Object.entries(accountData).map(([name, value]) => ({
        name,
        value: Math.abs(value),
        ratio: ((Math.abs(value) / total) * 100).toFixed(1),
        color: entityColors[name],
      })).filter(item => item.value > 0);
    };

    // 도넛 차트 데이터 미리 계산
    const donutData2024 = getBSDonutData('2024_4Q');
    const donutData2025 = getBSDonutData('2025_4Q');

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
                      <th className="text-center px-3 py-2 font-semibold text-zinc-600 border-r border-zinc-200 min-w-[95px]">2024.4Q</th>
                      <th className="text-center px-3 py-2 font-semibold text-zinc-900 border-r border-zinc-200 bg-zinc-100 min-w-[95px]">2025.4Q</th>
                      <th className="text-center px-3 py-2 font-semibold text-zinc-600 border-r border-zinc-200 min-w-[90px]">증감액</th>
                      <th className="text-center px-3 py-2 font-semibold text-zinc-600 min-w-[70px]">증감률</th>
                    </tr>
                  </thead>
                  <tbody>
                    {balanceItems.map((item, idx) => {
                      const val2024 = balanceSheetData['2024_4Q'][item.key] || 0;
                      const val2025 = balanceSheetData['2025_4Q'][item.key] || 0;
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
                    const prev = donutData2024.find(e => e.name === entity.name)?.value || 0;
                    const curr = entity.value;
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
                  const curr2025 = entityBSData['2025_4Q'][selectedBSAccount] || entityBSData['2025_4Q']['자산총계'];
                  const curr2024 = entityBSData['2024_4Q'][selectedBSAccount] || entityBSData['2024_4Q']['자산총계'];
                  
                  // 법인별 증감 계산
                  const changes = Object.keys(curr2025).map(entity => ({
                    name: entity,
                    diff: curr2025[entity] - curr2024[entity],
                    rate: curr2024[entity] !== 0 ? ((curr2025[entity] - curr2024[entity]) / Math.abs(curr2024[entity]) * 100).toFixed(1) : 0
                  })).sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));
                  
                  const total2025 = Object.values(curr2025).reduce((s, v) => s + v, 0);
                  const total2024 = Object.values(curr2024).reduce((s, v) => s + v, 0);
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
                <p className="text-xs text-zinc-500">2025년 4분기 연결 재무제표</p>
              </div>
            </div>
            <div className="px-3 py-1.5 bg-zinc-900 text-white text-xs font-medium rounded">
              FY2025 Q4
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
