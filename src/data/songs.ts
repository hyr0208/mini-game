import type { Chart } from '../engine/types';
import neonPulse from '../charts/neon-pulse.json';
import circuitBreaker from '../charts/circuit-breaker.json';

/**
 * 곡 선택 화면에서 보여줄 목록. 각 항목은 { time, lane } 배열을 담은 채보 JSON이다.
 * audioSrc가 없으면 GameScreen이 노트 타이밍으로 데모용 클릭 트랙을 생성해 재생한다.
 * 실제 음원을 쓰려면 public/audio/ 에 파일을 넣고 각 차트 JSON에 audioSrc를 추가하면 된다.
 */
export const SONGS: Chart[] = [neonPulse as Chart, circuitBreaker as Chart];
