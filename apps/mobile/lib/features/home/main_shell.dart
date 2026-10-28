import 'package:flutter/material.dart';

import '../../services/api_client.dart';
import '../auth/auth_controller.dart';
import '../reading/public_works_screen.dart';
import 'home_screen.dart';

/// 好みを伝え終えた人に見せる画面。下のタブで「みんなの作品」と「書く」（自分の作品）を切り替える
class MainShell extends StatefulWidget {
  const MainShell({
    super.key,
    required this.api,
    required this.auth,
    required this.onChooseAgain,
  });

  final ApiClient api;
  final AuthController auth;
  final VoidCallback onChooseAgain;

  @override
  State<MainShell> createState() => _MainShellState();
}

class _MainShellState extends State<MainShell> {
  int _tab = 0;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      // タブを切り替えても一覧の位置や読み込み済みの内容を保つ
      body: IndexedStack(
        index: _tab,
        children: [
          PublicWorksScreen(api: widget.api),
          HomeScreen(
            api: widget.api,
            auth: widget.auth,
            onChooseAgain: widget.onChooseAgain,
          ),
        ],
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _tab,
        onDestinationSelected: (i) => setState(() => _tab = i),
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.auto_stories_outlined),
            selectedIcon: Icon(Icons.auto_stories),
            label: 'みんなの作品',
          ),
          NavigationDestination(
            icon: Icon(Icons.edit_outlined),
            selectedIcon: Icon(Icons.edit),
            label: '書く',
          ),
        ],
      ),
    );
  }
}
