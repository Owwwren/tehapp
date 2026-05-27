--
-- PostgreSQL database dump
--

\restrict KpRt4VBVf6SSGCbKigiEhOvKjIfxNET4jTzQpaUgplcbvJ26ZDphSahX8gKU8ka

-- Dumped from database version 16.13
-- Dumped by pg_dump version 16.13

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: regions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.regions (id, name) FROM stdin;
2	Юг
3	Запад
4	Север
5	Урал
14	Все регионы КЦ
\.


--
-- Data for Name: cities; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.cities (id, name, region_id, timezone, created_at) FROM stdin;
1	Москва	3	\N	2026-05-04 00:11:25.363119
3	Колл-центр	14	\N	2026-05-08 20:22:36.13222
\.


--
-- Data for Name: branches; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.branches (id, name, city_id, type, is_active, created_at) FROM stdin;
1	Мытищи	1	БТ	t	2026-05-04 00:11:25.363119
3	Колл-центр	3	МНЧ	t	2026-05-08 20:39:52.705797
\.


--
-- Data for Name: cancel_reasons; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.cancel_reasons (id, name) FROM stdin;
1	Передумал
2	Недоезд
3	Стоп фактор
4	Не дозвонились
5	Ошибка приёмки
6	Дубль
7	Другое
8	Вброс
\.


--
-- Data for Name: contact_statuses; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.contact_statuses (id, name, color, text_color) FROM stdin;
1	Принял	\N	\N
3	Перенос	\N	\N
4	Перезвон	\N	\N
5	Не дозвонился	\N	\N
6	ОКК	\N	\N
7	ОКК (изменено)	\N	\N
8	Спам	\N	\N
9	Жалоба	\N	\N
10	Другое	\N	\N
2	Стоп фактор	#f32121	#fefeff
\.


--
-- Data for Name: contact_types; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.contact_types (id, name) FROM stdin;
1	Звонок
2	Сообщение
3	Локально
\.


--
-- Data for Name: departments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.departments (id, name, code) FROM stdin;
1	Бытовая техника	БТ
2	Колл центр	КЦ
3	Муж на час	МНЧ
\.


--
-- Data for Name: factors; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.factors (id, name) FROM stdin;
1	Обычная
2	Отзыв
3	Гарантия
4	Повтор
5	Дубль
\.


--
-- Data for Name: order_statuses; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.order_statuses (id, name, code, color, sort_order, is_final, created_at, text_color) FROM stdin;
1	Назначена	assigned	#6B7280	1	f	2026-05-03 22:48:26.876559	\N
2	Принял	accepted	#2563EB	2	f	2026-05-03 22:48:26.876559	\N
3	В работе	in_progress	#F59E0B	3	f	2026-05-03 22:48:26.876559	\N
4	СД	sd	#8B5CF6	4	f	2026-05-03 22:48:26.876559	\N
10	На удаление	pending_delete	#EF4444	10	f	2026-05-04 14:11:19.772644	\N
11	Отмена (вина КЦ)	cancelled_cc	#EF4444	11	t	2026-05-04 14:11:19.772644	\N
12	Отмена (вина БТ)	cancelled_bt	#EF4444	12	t	2026-05-04 14:11:19.772644	\N
6	Отказ	rejected	#EF4444	6	t	2026-05-03 22:48:26.876559	\N
7	Отмена	cancelled	#EF4444	7	t	2026-05-03 22:48:26.876559	\N
13	Вышел	out	#3B82F6	5	f	2026-05-04 15:19:52.821581	\N
15	Отмена (ожидает)	cancel_pending	#F59E0B	9	f	2026-05-04 19:57:39.654686	\N
16	Вброс	fake	#EF4444	13	t	2026-05-04 20:10:56.187284	\N
14	Передан	passed	#6B7280	0	f	2026-05-04 14:28:42.116261	\N
5	Выполнена	completed	#10B981	5	t	2026-05-03 22:48:26.876559	\N
\.


--
-- Data for Name: region_departments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.region_departments (region_id, department_id) FROM stdin;
2	1
3	1
4	1
5	1
14	2
\.


--
-- Data for Name: reject_reasons; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.reject_reasons (id, name) FROM stdin;
1	Возраст техники
2	Стоп фактор
3	Не в доступе
4	Вина мастера
5	КЛ нет 18
6	Нетрезвый КЛ
7	Другое
\.


--
-- Data for Name: roles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.roles (id, name, code, created_at) FROM stdin;
1	Главный директор	admin	2026-05-03 22:48:26.876559
2	Федеральный директор БТ	fed_bt	2026-05-03 22:48:26.876559
3	Федеральный директор КЦ	fed_cc	2026-05-03 22:48:26.876559
4	Региональный директор БТ	reg_bt	2026-05-03 22:48:26.876559
5	Региональный директор КЦ	reg_cc	2026-05-03 22:48:26.876559
6	Директор филиала БТ	dir_bt	2026-05-03 22:48:26.876559
7	Директор КЦ	dir_cc	2026-05-03 22:48:26.876559
8	Логист	logist	2026-05-03 22:48:26.876559
9	Оператор КЦ	operator	2026-05-03 22:48:26.876559
10	Мастер	master	2026-05-03 22:48:26.876559
11	ОКК	okk	2026-05-04 13:42:39.247355
12	Федеральный директор МНЧ	fed_mnch	2026-05-08 18:55:20.484355
13	Региональный директор МНЧ	reg_mnch	2026-05-08 18:55:20.484355
14	Директор филиала МНЧ	dir_mnch	2026-05-08 18:55:20.484355
\.


--
-- Data for Name: technics; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.technics (id, name, code, is_active, created_at) FROM stdin;
1	Холодильники	ХД	t	2026-05-03 22:48:26.876559
2	Стиральные машины	СМ	t	2026-05-03 22:48:26.876559
3	Варочные поверхности	ВП	t	2026-05-03 22:48:26.876559
4	Духовые шкафы	ДШ	t	2026-05-03 22:48:26.876559
5	Посудомоечные машины	ПМ	t	2026-05-03 22:48:26.876559
7	Сушильные машины	СШ	t	2026-05-08 21:49:52.482225
8	Телевизоры	ТВ	t	2026-05-08 21:50:00.093139
9	Кондиционеры	КДЦ	t	2026-05-08 21:50:18.005211
10	Компьютеры	ПК	t	2026-05-08 21:50:26.229367
11	Водонагреватели	ВН	t	2026-05-08 21:51:29.012675
12	Кофемашины	КМ	t	2026-05-08 21:52:32.963369
\.


--
-- Data for Name: transaction_types; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.transaction_types (id, name, direction, created_at) FROM stdin;
1	Приход	income	2026-05-04 10:56:18.963034
2	Расход	expense	2026-05-04 10:56:18.963034
\.


--
-- Data for Name: transaction_categories; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.transaction_categories (id, name, type_id) FROM stdin;
1	% мастера	1
2	Штраф (приход)	1
3	Другое (приход)	1
4	Нег. отзыв	2
5	Возврат	2
6	Реклама	2
7	Аренда офиса	2
8	Аренда жилья	2
9	Лид-Ген	2
10	Нужды офиса	2
11	Налог	2
12	ЗП	2
13	Штраф (расход)	2
14	Другое (расход)	2
\.


--
-- Name: branches_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.branches_id_seq', 3, true);


--
-- Name: cancel_reasons_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.cancel_reasons_id_seq', 9, true);


--
-- Name: cities_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.cities_id_seq', 3, true);


--
-- Name: contact_statuses_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.contact_statuses_id_seq', 11, true);


--
-- Name: contact_types_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.contact_types_id_seq', 4, true);


--
-- Name: departments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.departments_id_seq', 6, true);


--
-- Name: factors_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.factors_id_seq', 7, true);


--
-- Name: order_statuses_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.order_statuses_id_seq', 1, false);


--
-- Name: regions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.regions_id_seq', 14, true);


--
-- Name: reject_reasons_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.reject_reasons_id_seq', 8, true);


--
-- Name: roles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.roles_id_seq', 15, true);


--
-- Name: technics_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.technics_id_seq', 12, true);


--
-- Name: transaction_categories_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.transaction_categories_id_seq', 16, true);


--
-- Name: transaction_types_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.transaction_types_id_seq', 1, false);


--
-- PostgreSQL database dump complete
--

\unrestrict KpRt4VBVf6SSGCbKigiEhOvKjIfxNET4jTzQpaUgplcbvJ26ZDphSahX8gKU8ka

