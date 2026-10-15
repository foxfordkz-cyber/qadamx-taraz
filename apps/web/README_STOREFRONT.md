# Витрина Qadam (features/explore + features/inquiry)

Зависимости: react-router-dom@6, three, @react-three/fiber (8 для React 18 / 9 для React 19), @react-three/drei.

Команды запускаются из корня репозитория:
```sh
npm run dev
npm run build
```

Маршруты (подключить в router участника №3):
```tsx
<Route path="/" element={<ExplorePage />} />
<Route path="/venues/:slug" element={<VenuePage />} />
<Route path="/shops/:slug" element={<ShopPage />} />
```
`VITE_API_URL` — базовый URL API (по умолчанию `/api`).

Что сверить с `02_ARCHITECTURE_API.md`: поля в `explore/types.ts`, query-параметры `GET /businesses` (`venue`, `q`, `category`), тело и ответ `POST /businesses/{id}/inquiries`, путь кабинета продавца (`/cabinet`).
