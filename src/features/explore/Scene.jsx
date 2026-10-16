import React, {Component, Suspense, lazy, useState} from 'react';
import {useLocale} from './locale.jsx';
const SceneCanvas = lazy(() => import('./SceneCanvas.jsx'));
export function hasWebGL() {
  try {const canvas = document.createElement('canvas'); const gl = canvas.getContext('webgl2'); if (!gl) return false; gl.getExtension('WEBGL_lose_context')?.loseContext(); return true} catch {return false}
}
class Boundary extends Component {
  state = {failed:false};
  static getDerivedStateFromError() {return {failed:true}}
  render() {return this.state.failed ? this.props.fallback : this.props.children}
}
export function Scene({venues, venue, shops = [], selected}) {
  const {t} = useLocale(), [enabled] = useState(hasWebGL), [interactive, setInteractive] = useState(false);
  const fallback = <div className="scene-fallback"><span>◇</span><h3>{t('Каталог әрқашан қолжетімді', 'Каталог всегда доступен')}</h3><p>{t('3D қолжетімсіз. Төмендегі карточкалардан таңдаңыз.', '3D недоступен. Выберите карточку ниже.')}</p></div>;
  return <div className={'scene-shell' + (interactive ? ' scene-interactive' : '')}>
    <div className="scene-caption"><span className="live-dot"/> {t('ТАРАЗ · 3 АЛАҢ', 'ТАРАЗ · 3 ПЛОЩАДКИ')}<span>3D EXPLORER</span></div>
    <Boundary fallback={fallback}>{enabled ? <Suspense fallback={<div className="scene-fallback" role="status">{t('Сахна жүктелуде…', 'Загрузка сцены…')}</div>}><SceneCanvas venues={venues} venue={venue} shops={shops} selected={selected} interactive={interactive}/></Suspense> : fallback}</Boundary>
    <div className="scene-bottom"><span>{t('Шартты схема · нақты бағыт емес', 'Концептуальная схема · не маршрут')}</span>{enabled && <button className="scene-touch" type="button" aria-pressed={interactive} onClick={() => setInteractive(v => !v)}>{interactive ? t('Бетті айналдыру', 'Прокрутка страницы') : t('3D басқару', 'Управлять 3D')}</button>}</div>
  </div>;
}
