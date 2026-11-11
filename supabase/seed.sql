-- Data contoh (is_demo = true) dari src/data/seed-reports.json. Jalankan SETELAH schema.sql.
-- Aman dijalankan ulang: id yang sudah ada dilewati.
insert into public.reports (id, category, kec, lat, lng, status, support_count, is_demo, created_at) values
('R001','Jalan rusak','tulangan',-7.45557,112.648691,'dikerjakan',9,true,now() - interval '12 days'),
('R002','Jalan rusak','tulangan',-7.45539,112.648811,'disengketakan',11,true,now() - interval '45 days'),
('R003','Jalan rusak','tulangan',-7.45567,112.648891,'diverifikasi',7,true,now() - interval '100 days'),
('R004','Rambu atau marka rusak','tulangan',-7.461698,112.660422,'dikerjakan',8,true,now() - interval '65 days'),
('R005','Saluran tersumbat','tanggulangin',-7.485124,112.679256,'diterima',14,true,now() - interval '134 days'),
('R006','Saluran tersumbat','krembung',-7.515908,112.636687,'selesai_dinas',8,true,now() - interval '112 days'),
('R007','Rambu atau marka rusak','krian',-7.382944,112.609093,'terkonfirmasi',7,true,now() - interval '67 days'),
('R008','Saluran tersumbat','waru',-7.363601,112.752708,'terkonfirmasi',7,true,now() - interval '38 days'),
('R009','Jalan rusak','sedati',-7.424206,112.818902,'diterima',10,true,now() - interval '81 days'),
('R010','Sampah menumpuk','sidoarjo',-7.453614,112.757974,'selesai_dinas',6,true,now() - interval '22 days'),
('R011','Jalan rusak','tanggulangin',-7.515256,112.703016,'diverifikasi',8,true,now() - interval '7 days'),
('R012','Lampu jalan mati','sedati',-7.386022,112.790318,'diterima',9,true,now() - interval '40 days'),
('R013','Jalan rusak','sukodono',-7.413897,112.662035,'diterima',6,true,now() - interval '141 days'),
('R014','Saluran tersumbat','buduran',-7.417515,112.761076,'diterima',3,true,now() - interval '165 days'),
('R015','Lampu jalan mati','sukodono',-7.419758,112.697117,'diterima',4,true,now() - interval '100 days'),
('R016','Rambu atau marka rusak','prambon',-7.463871,112.574867,'diverifikasi',13,true,now() - interval '71 days'),
('R017','Sampah menumpuk','balongbendo',-7.420436,112.481587,'disengketakan',8,true,now() - interval '105 days'),
('R018','Rambu atau marka rusak','porong',-7.527972,112.681191,'disengketakan',3,true,now() - interval '138 days'),
('R019','Lampu jalan mati','sidoarjo',-7.455922,112.752173,'diterima',12,true,now() - interval '26 days'),
('R020','Lampu jalan mati','gedangan',-7.376058,112.739114,'diverifikasi',10,true,now() - interval '166 days'),
('R021','Jalan rusak','sukodono',-7.412443,112.697945,'dikerjakan',1,true,now() - interval '15 days'),
('R022','Sampah menumpuk','candi',-7.48016,112.758685,'diterima',12,true,now() - interval '81 days'),
('R023','Jalan rusak','krian',-7.405513,112.573708,'dikerjakan',13,true,now() - interval '96 days'),
('R024','Sampah menumpuk','krian',-7.376411,112.611023,'dikerjakan',4,true,now() - interval '85 days'),
('R025','Rambu atau marka rusak','tanggulangin',-7.515878,112.72653,'selesai_dinas',11,true,now() - interval '15 days'),
('R026','Jalan rusak','candi',-7.47483,112.753238,'diverifikasi',9,true,now() - interval '109 days'),
('R027','Lampu jalan mati','prambon',-7.471394,112.557706,'selesai_dinas',2,true,now() - interval '33 days'),
('R028','Jalan rusak','waru',-7.362476,112.802227,'diterima',8,true,now() - interval '71 days'),
('R029','Jalan rusak','wonoayu',-7.445492,112.595215,'terkonfirmasi',13,true,now() - interval '167 days'),
('R030','Jalan rusak','sukodono',-7.408737,112.68584,'terkonfirmasi',3,true,now() - interval '161 days'),
('R031','Saluran tersumbat','taman',-7.340008,112.705435,'dikerjakan',12,true,now() - interval '93 days'),
('R032','Saluran tersumbat','tulangan',-7.478954,112.638643,'dikerjakan',12,true,now() - interval '141 days'),
('R033','Jalan rusak','gedangan',-7.390127,112.723058,'terkonfirmasi',13,true,now() - interval '91 days'),
('R034','Jalan rusak','sukodono',-7.419743,112.683946,'dikerjakan',8,true,now() - interval '5 days'),
('R035','Lampu jalan mati','wonoayu',-7.420071,112.630626,'diverifikasi',1,true,now() - interval '131 days'),
('R036','Rambu atau marka rusak','porong',-7.543499,112.681966,'dikerjakan',5,true,now() - interval '74 days'),
('R037','Saluran tersumbat','wonoayu',-7.408952,112.640012,'diverifikasi',5,true,now() - interval '109 days'),
('R038','Jalan rusak','gedangan',-7.40659,112.730591,'dikerjakan',10,true,now() - interval '132 days'),
('R039','Jalan rusak','buduran',-7.417649,112.705617,'selesai_dinas',4,true,now() - interval '98 days'),
('R040','Sampah menumpuk','porong',-7.531188,112.705115,'diterima',14,true,now() - interval '83 days'),
('R041','Sampah menumpuk','krian',-7.40549,112.572277,'selesai_dinas',6,true,now() - interval '90 days')
on conflict (id) do nothing;

-- Isi kode tiket agar laporan contoh dapat dikelola dari Dashboard Admin.
update public.reports
set code = 'RW-' || replace(id, 'R', '1')
where is_demo and code is null and id ~ '^R[0-9]+$';
