/**
 * @file App — главный компонент маршрутизации приложения.
 *
 * Здесь задаётся HashRouter и стартовая страница приложения.
 */

import { HashRouter, Route, Routes } from 'react-router'
import HomePage from './pages/Home'

/**
 * App — основной routing-компонент.
 * Делает страницу Home стартовой (path="/") и обеспечивает fallback.
 */
export default function App(): JSX.Element {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        {/* Фоллбек: если путь не найден, показываем домашнюю страницу */}
        <Route path="*" element={<HomePage />} />
      </Routes>
    </HashRouter>
  )
}
