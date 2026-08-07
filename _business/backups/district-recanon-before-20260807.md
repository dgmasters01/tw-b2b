# 지역명 한국어 통일 — 되돌리기용 원본 (2026-08-07)

> `hotels.district` 에 영어·한자로 남아 있던 값의 **바꾸기 직전 상태**다.
> 되돌릴 일이 생기면 아래 표대로 `update hotels set district=... where id=...` 하면 된다.
> 원본 주소(`hotels.address`)는 손대지 않았으므로, 봇이 언제든 다시 뽑을 수도 있다.

- 대상: **243행** / 8개 도시
- 사전: `api/_lib/district-parse.js` 의 `canonDistrict()`

| id | city | 바꾸기 전 district |
|---|---|---|
| 01f25243-fc08-46da-ac94-8430bbd7fb0c | Seoul | Seocho |
| 04ad837a-e7e7-4ea6-96cf-411ec7a48d0e | Taipei | Zhongzheng |
| 05eb37bd-77c2-4494-a80f-1018fc3bb759 | Ho Chi Minh City | Ben Thanh |
| 060b4a8c-1e10-4530-9755-fb0f194bbb72 | Taipei | Zhongzheng |
| 063cdef4-a751-409f-aad3-0efc30c5f492 | Taipei | Zhongzheng |
| 078019ab-ea82-42d6-8e67-17ad46a6bcdb | Taipei | Wanhua |
| 0800fa95-2b6f-4e60-9c6e-eeaee040b573 | Ho Chi Minh City | Pham Ngu Lao |
| 08744937-afcb-48e9-8884-d97bcba301aa | Kyoto | Shimogyo |
| 08c426c3-4898-4e1c-a15b-8ad272541666 | Taipei | Zhongshan |
| 0c783b00-31b6-4eb2-9aec-87182d6cb5f2 | Kyoto | Shimogyo |
| 0cc33b78-ea15-4245-a073-42b901244a15 | Taipei | Zhongzheng |
| 0f1c26ed-ea71-4367-aa91-98827428df68 | Taipei | Sanchong |
| 0f4edc32-bb3e-472f-a8ff-b0970e10bd05 | Taipei | Wanhua |
| 0f503aba-fc8b-46b6-b44f-f755eb42aefb | Da Nang | My An |
| 10945cdf-ef5e-41ef-a23e-f6706af3e18c | Kyoto | Shimogyo |
| 124e6754-3b49-4a7d-9bbc-ba6f3811fb7e | Ho Chi Minh City | BEN THANH |
| 128bcf5c-bed9-42a0-849f-1ee5bdf01916 | Ho Chi Minh City | Sai Gon |
| 128d221a-d8f5-4a9c-abf0-679fc799af62 | Ho Chi Minh City | Ben Thanh |
| 12a397a1-651b-404a-8c3d-6b2f98e364a8 | Ho Chi Minh City | Ben Thanh |
| 12b54e05-d74a-45c0-8422-866276186f5d | Ho Chi Minh City | Ben Nghe |
| 1309890b-f2b6-4407-b3f7-641e58330cd7 | Ho Chi Minh City | Ben Thanh |
| 15fd93c8-a2b1-4078-aced-828a0defcf59 | Taipei | Wanhua |
| 1655fb34-5ea6-4620-b5c0-0fb4071d3b14 | Ho Chi Minh City | Cau Kho |
| 166bf3ca-8c3d-4a7d-a27f-93a4a0334cdd | Ho Chi Minh City | Dakao |
| 17c61730-ec94-4422-ae59-9f087d54a37d | Da Nang | An Hai Bac |
| 17d6df35-8659-43fa-a928-3fd442ae14d7 | Nagoya | Naka |
| 18c90316-670e-44ad-acb0-09ae24685707 | Bangkok | Wattana |
| 18f6087f-00aa-4d0d-8eac-772e0c649df0 | Taipei | Wanhua |
| 1a457642-7a1f-4509-9551-01d4dae09e37 | Ho Chi Minh City | Ben Nghe |
| 1a55f824-0da5-4a38-afb3-2c18f1c980b2 | Taipei | Zhongzheng |
| 1a6d47da-23d1-45fb-bd2d-9310ff26dc66 | Kyoto | Shimogyo |
| 1c58e5e8-1b7c-47a7-a42f-742649d9adb2 | Ho Chi Minh City | Ben Thanh |
| 1e1e2c1f-6d39-4280-a276-74234250d28b | Seoul | Jongno |
| 1fc67563-8a46-4919-8e47-54904b33e6bc | Ho Chi Minh City | Ben Thanh |
| 205591e1-332a-4955-b9fc-23d5d30d53ab | Da Nang | Ngu Hanh Son |
| 20cc6981-a567-4cc3-a603-9c6201a2d6eb | Kyoto | Shimogyo |
| 20ee5726-4693-47fc-aef4-f5557c23c97d | Ho Chi Minh City | Pham Ngu Lao |
| 210a55a2-6276-4b6b-9f77-98a2b61196cd | Taipei | Zhongzheng |
| 237a61e2-25c0-4f46-83f2-7af29a2ed11a | Taipei | Datong |
| 243f7f20-3940-4114-ae56-fdd7c0ee2bde | Ho Chi Minh City | Thanh My Tay |
| 25d3e8e0-6837-4fcd-871f-df6be7c0ff74 | Taipei | Da’an |
| 272d2752-db66-416b-a9d0-b431bd745e1f | Kyoto | Shimogyo |
| 28325992-7dae-4dc6-aeed-2e7520efe812 | Da Nang | Son Tra |
| 289256f3-2f12-46ab-bd20-f6b02ece52d0 | Ho Chi Minh City | Ben Thanh |
| 28adfa6e-3d44-4958-989d-d8e8861a67c2 | Ho Chi Minh City | Ben Thanh |
| 2a1b22fe-6b2c-47c9-ade0-a453af2fcc4f | Tokyo | Toshima |
| 2f48865d-f618-47dd-964b-269701be46b3 | Da Nang | Phuoc My |
| 30df76dc-457a-4f0e-9d00-40b4ae4c5701 | Da Nang | Ngu Hanh Son |
| 3187d4f5-35af-4893-83b6-add7594b6d80 | Nagoya | Naka |
| 347da286-f127-4038-8668-c06247d7055b | Da Nang | An Hai Tay |
| 38ae39fa-238b-4507-ac68-dbde7bf6b29c | Da Nang | Hai Chau |
| 3967a70e-2ef2-41a9-95f2-0ba0efe3a2af | Bangkok | Klong San |
| 39a9fb92-de9a-4839-8d47-6a017437ae86 | Taipei | Wanhua |
| 39b96e66-ee98-419a-9b10-e8aed09fb32b | Taipei | Zhongzheng |
| 3adca634-4bd8-49b1-9205-4661ed646562 | Taipei | SongShan |
| 3b34e7f6-c371-4531-8ea0-c222613472e7 | Bangkok | Bangrak |
| 3c6d3f31-2a25-4dc5-a80d-56cec73ad191 | Taipei | Zhongshan |
| 3de14ca7-c30e-4c15-9113-6bca20ac9546 | Ho Chi Minh City | Ben Thanh |
| 3ebc47ef-bbc8-4e2c-8ec8-87d5bb2025c3 | Taipei | Chongqing S. Rd. Zhongzheng |
| 4171b6d2-762d-4e11-a838-9f760dafcfde | Taipei | Wanhua |
| 428b5f27-8696-43c3-95a2-a9e5e9f82ef7 | Taipei | Datong |
| 4357e135-85f6-4726-85c4-1f96b33ed7a4 | Taipei | Zhongzheng |
| 44dd827f-acde-461b-bfa2-f02b839752a9 | Taipei | Wanhua |
| 46d057af-d2ab-48dc-8460-01837e96a838 | Seoul | Jongno |
| 48213628-58ec-41d8-b8b0-638286c9576a | Da Nang | My An |
| 488fb3cf-0c3f-487d-b25a-d199c169c7d6 | Kyoto | Shimogyo |
| 4c1b2be5-8a51-43f1-b503-6583de0dfb55 | Da Nang | Hai Chau |
| 4c89a1ad-843c-497e-bc9f-85ae64544e40 | Da Nang | Ngu Hanh Son |
| 4cc3ef58-8897-4435-b695-2cd18a429d09 | Ho Chi Minh City | An Khanh |
| 4eed68a7-3522-4157-9ea9-ffedf9992c4f | Da Nang | Hai Van |
| 4efaf4ac-b395-456d-b160-87f061742fc6 | Seoul | Jongno |
| 4f93fcc1-0209-43f6-b2b0-7fab37ef1a37 | Kyoto | Nakagyo |
| 4fee8d96-e615-439d-9821-cd615894a89d | Ho Chi Minh City | Saigon |
| 5043849e-caa1-46a4-82d8-da6e58902936 | Kyoto | Sakyo |
| 50898290-3edd-4dc9-ab52-eea0e5950255 | Da Nang | Dien Ban Dong |
| 51b942fe-47d2-4360-8aa7-895bdd2b4cad | Ho Chi Minh City | Ben Thanh |
| 51e8ba9f-3975-4aef-8a7d-824faab3c1b3 | Ho Chi Minh City | Saigon |
| 52bd3517-26ae-42d0-96e2-de8b76f04b3f | Kyoto | Nakagyo |
| 5324d0fb-d824-483d-bd73-5db3e5247e4e | Da Nang | Hai Chau |
| 54807c1e-f883-416f-9a79-51d6344cc0e6 | Ho Chi Minh City | Pham Ngu Lao |
| 5646b215-e013-4637-9fba-7eb2b43638b3 | Ho Chi Minh City | Tan Phong |
| 579637cf-cd02-4e31-9425-e3893e69bc56 | Ho Chi Minh City | Tan Phong |
| 57e54c21-0429-42f7-a2fe-975ed7f22135 | Da Nang | Hai Chau |
| 58efdab0-6203-4f48-b438-797a7283061a | Da Nang | Dien Ban Dong |
| 5938a223-e6e8-41e0-9c93-03c2b8109e42 | Da Nang | Phuoc My |
| 597740f6-a637-495f-9db2-4602fd864328 | Kyoto | Nakagyo |
| 59780667-2739-456e-923d-23b4d8c6ab7d | Da Nang | An Hai |
| 59ec5de4-9fe0-4fea-baf8-b82eb259026f | Bangkok | Wattana |
| 5a5faa9f-4d2a-4239-aac0-2a1b65c41fd6 | Kyoto | Shimogyo |
| 5ac1b467-33f1-4bbb-97f0-54cdbf784714 | Ho Chi Minh City | Ben Nghe |
| 5c9ea4d2-d46f-4096-aad9-adb96a060b02 | Ho Chi Minh City | Ben Thanh |
| 5e88a93e-05a3-46e2-8105-8ade70e81e61 | Kyoto | Shimogyo |
| 5e8b5766-faa5-4747-aab2-c11aba70d892 | Kyoto | Shimogyo |
| 5efc9ec3-fa0b-4739-b67c-f41708f8c29c | Ho Chi Minh City | Binh Thanh |
| 5f306b17-58f0-4651-b81e-2d1e3bfa08ba | Da Nang | Hai Chau |
| 6332949e-c15c-4228-ad61-6d865af26bcc | Kyoto | Nakagyo |
| 6454a3e1-cba1-47c2-aa78-1bbadabd63af | Taipei | Xinyi |
| 65676e30-4a05-4b70-b54c-08692938cce4 | Ho Chi Minh City | An Phu |
| 65c62a3e-58d2-4038-93df-2d349df10962 | Taipei | Zhongzheng |
| 664957a9-3e86-48db-8ef9-c2ab0c98ebb7 | Nagoya | Nakamura |
| 66bbe232-3332-4037-8b64-765c6a2bb712 | Taipei | Ruifang |
| 66ea2a46-487c-42b7-bfe0-9f4e1bbeda07 | Ho Chi Minh City | Nguyen Cu Trinh |
| 66f0e1de-e811-435e-9ef7-b0f4245551a5 | Ho Chi Minh City | Pham Ngu Lao |
| 6afe6a16-0ec5-4b88-afb8-1a1ba9d23646 | Taipei | Wanhua |
| 6ce655ae-6573-4518-b753-03e2807fe329 | Bangkok | Sukhumvit Road Bangchak Sub |
| 6cffd40a-bd7d-4686-9772-dadb53a89ced | Da Nang | Ngu Hanh Son |
| 6f4a351f-27fc-4911-a8f7-a35a929a2669 | Da Nang | Hai Chau |
| 7048de8e-2f00-4f9f-804a-5e9aed639cb0 | Ho Chi Minh City | Sai Gon |
| 711e389a-b3f1-4de3-94d3-ee140f431867 | Bangkok | Samphanthawong |
| 73b17928-01a0-4a97-8cb3-df380087b848 | Taipei | Zhongshan |
| 74030ac2-9093-4ccb-bc5a-854fc455d454 | Kyoto | Shimogyo |
| 75402468-06b9-4425-9dc6-8a084c662cc7 | Bangkok | Ratchathewi |
| 768f23c7-a0df-4fad-8c93-f4b8da764458 | Taipei | Zhongshan |
| 774c7e70-7cec-4911-8632-ebcdbf1b6edf | Ho Chi Minh City | Ben Nghe |
| 7805475a-da61-4291-976e-af99b8f553f5 | Kyoto | Nakagyo |
| 786eb777-dc4f-4c59-9bcc-2b56ddab277e | Ho Chi Minh City | Ben Nghe |
| 7939a398-2e1d-4962-ba45-2da7b44e66db | Taipei | Zhongzheng |
| 79d4f27e-651c-4a37-a288-e5f6bb57962c | Ho Chi Minh City | Ben Thanh |
| 7ba648e3-6cea-4540-a7eb-ab097952be46 | Nagoya | Naka |
| 7eae3513-9f78-439f-a6a1-6b0262e182df | Taipei | Songshan |
| 7ec2d9af-7127-4d81-b809-4e10e0237cb4 | Da Nang | Son Tra |
| 803e4da6-ca3e-4479-956c-baa84cca9a52 | Taipei | Wanhua |
| 80ad0e5e-0c5e-411d-ad68-ca58a1fda88b | Kyoto | Shimogyo |
| 81069b8f-079b-4a5e-ad10-313896303df7 | Bangkok | Phra Nakhon |
| 820cfdc7-8da6-4a1d-bcd8-f63b57eb7bda | Da Nang | Hoa Cuong Bac |
| 82afe7a0-697a-4b02-81c1-84f3c9b74b6c | Da Nang | An Hai Bac |
| 83d24b2f-9b2a-4b08-916f-0aa58f181b20 | Ho Chi Minh City | Tan Hung |
| 84be909c-8472-4317-8019-84787a4cff77 | Ho Chi Minh City | Ben Thanh |
| 84c1ae24-aa76-4ee0-b0fc-6a18ff710256 | Ho Chi Minh City | Tan Hung |
| 85a666be-c9d6-4c21-9322-ebe2f4ba0d2f | Da Nang | Ngu Hanh Son |
| 869802af-d188-4830-9fa0-e8d2bbc942e7 | Kyoto | Shimogyo |
| 86a4b469-84cc-40b0-b003-4785532179b7 | Ho Chi Minh City | Ben Nghe |
| 8743b16b-d96d-4001-bee5-5808c728415d | Ho Chi Minh City | Ben Thanh |
| 87df44d8-916b-4698-8e5b-cd26178603b1 | Kyoto | Shimogyo |
| 888db120-3587-4eed-b320-bd3a51eb5103 | Ho Chi Minh City | Vo Thi Sau |
| 8ac3ccbc-90b3-438d-8536-6959d21532b4 | Ho Chi Minh City | Ben Thanh |
| 8b561402-e38d-4e35-b93b-e05653c32583 | Taipei | Wanhua |
| 8ca88494-4411-4d2e-92ed-11c7540fa298 | Taipei | Zhongshan |
| 8e6d8353-6657-484e-8a0e-200d7065c056 | Da Nang | Son Tra |
| 9040fd8d-1519-4ce6-951a-4046f8da1941 | Ho Chi Minh City | Sai Gon |
| 90efc7aa-2c2e-491a-9365-74d8e0d24856 | Taipei | Zhongzheng |
| 94743a6b-11eb-49a7-add4-7f30b52ba36b | Taipei | Da’an |
| 948dce9d-4dc8-4444-9a51-b75b35ab87cd | Taipei | Banqiao |
| 986a3577-c194-4f4e-8bb7-2e940002df0e | Ho Chi Minh City | Nguyen Thai Binh |
| 999e2e98-5d87-4efe-b898-f2b9b4a1909d | Taipei | Zhongshan |
| 99dd1835-dffd-4fad-a2b9-bf834817edb7 | Ho Chi Minh City | Cau Ong Lanh |
| 9abf0291-7347-4c64-aa66-33404f0c3ff7 | Ho Chi Minh City | Ben Nghe |
| 9ad12138-22e4-40a1-92dd-bfa0dca32f8b | Kyoto | 391-1 Shiogamacho Shimogyo |
| 9b7f8f7a-245f-4e1b-8bb6-286c131c60ae | Da Nang | 15 Le Duan Street Hai Chau 1 |
| 9da3bff8-e585-49d9-919e-2213c5e11ea0 | Nagoya | Naka |
| 9dd723c3-512a-44f3-9f93-2f8f865369ea | Taipei | Sanchong |
| 9e7b2d73-fbab-460d-b2fb-32399ac46f1f | Kyoto | Shimogyo |
| 9f629d21-0a05-44ba-8368-e6a970a7a296 | Taipei | Datong |
| a2cbcc19-2a47-468a-a863-4a8a0d044b5d | Nagoya | Naka |
| a3f723e9-1a48-4160-a0c7-3d9869e296af | Da Nang | An Hai Bac |
| a55b711b-fb42-4f2c-bfc8-4fab6125b1d4 | Ho Chi Minh City | Ben Thanh |
| a5861808-6df0-4bbf-b063-b3221940d18d | Da Nang | Hoa Cuong Bac |
| a71b925d-b527-47d0-86e2-283d9ceb972b | Ho Chi Minh City | Pham Ngu Lao |
| aaa75bbe-a69d-4980-879d-facb7733aaeb | Ho Chi Minh City | Ong Lanh |
| aadc9802-3af3-4493-8e68-954658ee6980 | Ho Chi Minh City | Nguyen Thai Binh |
| abdb2d70-b839-4399-ba75-0cd33e1ae638 | Da Nang | Hai chau |
| abf49d16-b70f-4ca6-8a88-b89bb1f6a14b | Da Nang | Phuoc My |
| ac439d51-6797-42f4-b7d1-213f525f5264 | Taipei | Zhongzheng |
| afcd2bbb-0eb2-44d4-b9eb-cd9011a488ed | Nagoya | Higashi |
| b296ec00-b273-44b5-99ec-940e3d87a17c | Da Nang | My An |
| b7ad05a0-84cc-4179-a218-2ee3e18e4d22 | Ho Chi Minh City | Binh Thanh |
| b8337e12-9521-47a1-9931-4c6d0cde6d7a | Ho Chi Minh City | Co Giang |
| b9697843-cb8f-4ac4-8f9c-36c1b415189f | Da Nang | Ngu Hanh Son |
| ba6a1e22-2c36-4817-8e93-3690ed0788c1 | Taipei | Wanhua |
| bb4a3e48-f8e3-45bb-bc65-340dacc72399 | Ho Chi Minh City | BEN THANH |
| bbf2f39e-b9c8-41f6-810d-4fba254bb99b | Kyoto | Shimogyo |
| bcdd8981-a664-4e24-9968-b154b09e39c7 | Taipei | Wanhua |
| bdc135ca-95b5-4f84-84e6-68f067dd307b | Da Nang | Phuoc My |
| be9e7c68-1366-44e0-a957-d63ab7b31251 | Ho Chi Minh City | Co Giang |
| bedfd938-4341-4add-a216-41c933455695 | Da Nang | Dien Ban Dong |
| c09ff017-e44a-4d86-a9d0-234d2805f276 | Da Nang | Phuoc My |
| c0cf3882-8a06-471f-9d0e-7c3149c3880e | Da Nang | My An |
| c2c89f13-084c-4097-a232-3bbf613f9326 | Taipei | Zhongzheng |
| c2fb304a-b300-454b-9fba-6db9f35688c1 | Taipei | Zhongzheng |
| c33a3297-0be0-45d0-9d92-ed4ec2a63823 | Nagoya | Naka |
| c410ee3b-87d4-4218-8512-8e0edc2e4dea | Taipei | Wanhua |
| c4f4ed49-6bef-40e7-82b7-7decd76f6a06 | Kyoto | Shimogyo |
| c54a63a5-8e5a-4683-802e-65aedeb62528 | Ho Chi Minh City | Sai Gon |
| c5d767d4-c6af-451d-8fbe-506cf68dc487 | Nagoya | Nakamura |
| c5e703be-065a-4a86-9576-ac96a86cce90 | Kyoto | Nakagyo |
| c6193d62-5cc7-45c9-94b3-8f83fe58a0c5 | Da Nang | Son Tra |
| c6ac8bbd-0ed2-4d38-9fbd-031df79b77a7 | Taipei | 中山區 Zhongshan |
| c84a748f-7833-4d42-b259-9186a0548d33 | Da Nang | My An |
| c86f3d4b-fa86-4d96-9115-5a9a8187faf6 | Kyoto | Shimogyo |
| c893ed65-8617-4896-93ea-9905b6940ac1 | Ho Chi Minh City | Nguyen Thai Binh |
| c96f7247-ea8c-4362-b440-a330463af75f | Ho Chi Minh City | Dakao |
| c9ee500b-b969-4387-9b37-84c7b4a11b96 | Ho Chi Minh City | Tan Dinh |
| ca725449-534c-45de-a5b4-98d9072b165d | Taipei | Ruifang |
| caec250c-78c8-4d30-88be-07e5870ff20b | Ho Chi Minh City | Ben Thanh |
| ccb2c574-6baa-472e-9fcb-ac1c41888263 | Ho Chi Minh City | Cau Ong Lanh |
| cd4190fb-ab48-4b49-8078-4dc8a028a4c1 | Kyoto | Higashiyama |
| cf408a30-143e-4f7d-bd57-043e48734247 | Taipei | Zhongzheng |
| d014f656-a277-47d4-9fc4-5af30e8f11b2 | Da Nang | An Hai |
| d11fd1bc-4681-4b35-a284-0e7c590eb6d8 | Seoul | Gwangjin |
| d325b2ad-5945-4cef-b8c7-4a8dc7b7c498 | Taipei | Wanhua |
| d351c8f0-02a3-4f0e-b747-6351acb2a1c6 | Ho Chi Minh City | Pham Ngu Lao |
| d43d9b5d-17fc-4ebb-b35f-f19e3599b960 | Da Nang | Hai Chau |
| d460a5fc-be9f-4b5c-aed5-6baa12645a1c | Kyoto | Nakagyo |
| d58d022f-3834-4ceb-b391-cb3cc709e59b | Ho Chi Minh City | Tan Phong |
| d6ca14db-dd26-44dc-9cf0-ea5bcba336b8 | Kyoto | Shimogyo |
| d75595b8-c0ea-4ef9-b4b8-89a28e83c164 | Ho Chi Minh City | Ben Thanh |
| d900fd78-29a8-48cc-9840-72f749ea5e38 | Nagoya | Naka |
| dbd86479-b97b-483e-b58e-91e8133a1a03 | Taipei | Beitou |
| dbfbda43-8bb2-4395-ab98-c146680ee6ea | Taipei | Zhongzheng |
| ddb2f2b8-fab9-48df-aa8e-2e3369c202a1 | Kyoto | Minami |
| de2e1f0e-e225-43c1-9642-881c5d127cd9 | Taipei | Zhongzheng |
| deeca8f0-bc8f-44fb-a7c5-72a3cef4a490 | Ho Chi Minh City | Ben Thanh |
| df012022-95b0-468c-8e1f-5ecf47aa5ac6 | Ho Chi Minh City | Sai Gon |
| df5119f1-a740-4dff-a365-93f54de8582b | Kyoto | Shimogyo |
| e0346cdb-160c-431e-8ed2-4ed28d7ca9d2 | Taipei | Zhongshan |
| e037045e-296b-446d-aa9a-e163b1484392 | Taipei | Wanhua |
| e078f983-7bb8-4c19-9d49-46d25fee33ef | Kyoto | Shimogyo |
| e0b24e0c-8ed7-4bed-beb6-7387e9abef02 | Ho Chi Minh City | Co Giang |
| e32cc098-fe7f-47dc-9df8-1e1d04f6623c | Da Nang | Phuoc My |
| e3d5ef40-71e9-42d9-bdf8-972ae8ec90fb | Kyoto | Nakagyo |
| e41c4073-5c0e-40fd-94fb-d4ff27528034 | Kyoto | Higashiyama |
| e7c7618c-18ba-496b-a33a-2f486b85b072 | Kyoto | Nakagyo |
| e87e0dad-ecdd-4c58-ae07-94b0b96d16e5 | Da Nang | My An |
| e89d5a8b-74fa-4109-a465-55e862f7b9d8 | Ho Chi Minh City | Co Giang |
| e9baa489-d70d-41dc-a8be-e02a9e2231ba | Seoul | Jung |
| e9ef50b5-4e8b-4e94-a1f4-4bdf66d6e375 | Taipei | Wanhua |
| ebd5165d-c414-4427-9bf9-4cda234a2c67 | Kyoto | Nakagyo |
| ecb5119f-f42f-45bc-8d24-494e6743bb42 | Taipei | Wanhua |
| ed0951e1-52da-483b-aa59-b93e07b9e798 | Kyoto | Shimogyo |
| efd40d06-4518-4f79-9ad7-6377c5d2e44b | Taipei | Zhongzheng |
| f10cda27-41b1-441a-a8a5-509230493a6f | Kyoto | Shimogyo |
| f452220d-d0fe-4464-af2d-b852f23b0420 | Da Nang | Phuoc My |
| f4a40628-6f4e-4cbf-ab29-399241bbe862 | Da Nang | Hai Chau |
| f736c8f6-998d-4a21-b83e-a8c9d39ebff1 | Kyoto | Nakagyo |
| f8f458f4-26b6-40de-af96-efaac8a28dc1 | Taipei | Banqiao |
| f9999024-67a5-43fc-8092-8a02dba048b1 | Da Nang | Ngu H nh Son |
| fb269803-d41f-46ca-82ca-b8dcaf6f19e9 | Ho Chi Minh City | Sai Gon |
| fc2e76f0-e0e3-4b35-b091-669c988647ca | Kyoto | Higashiyama |
| fc901e2d-6a5e-46fa-9690-7b1b2c58f6be | Da Nang | An Hai Dong |
| fdf937ff-f2e8-4f8d-ac1a-ce2745108e3f | Kyoto | Shimogyo |
| fe58bc8c-3e6d-4f10-b09b-f95aa41a355c | Ho Chi Minh City | Pham Ngu Lao |
| febe1f28-0035-4618-9b1a-2d4bddb08e96 | Da Nang | Ngu Hanh Son |
| ff189c5c-a240-4772-bd3c-6e0430ab5ac2 | Ho Chi Minh City | Sai Gon |
