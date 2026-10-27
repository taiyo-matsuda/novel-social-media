-- ログインと最初の画面（冒頭文の選択）のための追加
-- 1. 新しく登録した利用者に profiles の行を自動で作る（opening_choices などが profiles を参照するため）
-- 2. 最初の画面で見せる冒頭文を用意する

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- profiles は誰でも読めるので、メールアドレスは入れない。表示名は後で本人が変える
  insert into public.profiles (id, display_name)
  values (new.id, '読者')
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- このマイグレーションより前に登録していた利用者の分も作っておく
insert into public.profiles (id, display_name)
select id, '読者' from auth.users
on conflict (id) do nothing;

-- 表示する順番（小さいほど先）。ジャンルが偏らないように並べる
alter table public.openings add column sort_order int not null default 0;

insert into public.openings (text, genre, sort_order) values
  ('雨の夜、閉店したはずの古書店に灯りがともっていた。扉を押すと、カウンターの向こうで見知らぬ少女が、私の名前が書かれた本を読んでいた。', 'ミステリー', 10),
  ('勇者が魔王を倒してから三百年。平和になりすぎた王国で、元魔王軍の四天王だった私は、今日もパン屋の開店準備をしている。', 'ファンタジー', 20),
  ('「好きです」と言うつもりだった。卒業式の朝、彼の下駄箱に入っていたのは、私が書いたはずのラブレターだった。', '恋愛', 30),
  ('火星行きの移民船が出発して四十年。船内で生まれた僕たちは、地球を一度も見たことがない。そして今朝、航路が書き換えられていることに気づいた。', 'SF', 40),
  ('祖母の家の押し入れには、開けてはいけない襖がある。子どものころそう教えられた。祖母の葬儀の夜、その襖の向こうから、祖母の声がした。', 'ホラー', 50),
  ('定年まであと一年。三十八年勤めた町工場が、来月で閉鎖されると聞いた。妻にはまだ言えていない。', 'ヒューマンドラマ', 60),
  ('目が覚めると、私は自分が書いた小説の悪役令嬢になっていた。しかも、断罪イベントは今夜だ。', '異世界転生', 70),
  ('慶長五年、関ヶ原。どちらの陣にもつかず、戦の行方だけを見届けよと命じられた忍びがいた。', '歴史', 80),
  ('うちの猫が、ある日しゃべった。第一声は「おまえ、明日の会議で失敗するぞ」だった。', 'コメディ', 90),
  ('十年ぶりに帰った港町で、幼なじみは漁師になっていた。あの夏、二人で海に沈めた箱のことを、彼はもう覚えていないふりをした。', '青春', 100),
  ('事件の容疑者は七人。全員が同じ夢を見たと証言した。夢の中で、被害者は自分で自分を殺していた。', 'ミステリー', 110),
  ('竜の背に乗れるのは、竜に選ばれた者だけ。選ばれなかった私は、竜の世話係として、今日も鱗を磨いている。', 'ファンタジー', 120);
