#!/usr/bin/env python3
"""ดึงไอคอนจาก game-icons.net (CC BY 3.0) ผ่านแพ็กเกจ @iconify-json/game-icons
ใช้: python3 tools/build_icons.py <icons.json> <out.json>"""
import json, sys
SRC = json.load(open(sys.argv[1]))
PICK = {
  # คลาส
  'barbarian': 'barbarian', 'bard': 'lyre', 'cleric': 'holy-symbol', 'druid': 'oak-leaf',
  'fighter': 'crossed-swords', 'monk': 'fist', 'paladin': 'knight-banner', 'ranger': 'pocket-bow',
  'rogue': 'hood', 'sorcerer': 'magic-swirl', 'warlock': 'warlock-eye', 'wizard': 'wizard-staff',
  # species
  'dragonborn': 'dragon-head', 'dwarf': 'dwarf-face', 'elf': 'elf-ear', 'gnome': 'bad-gnome',
  'goliath': 'giant', 'halfling': 'barefoot', 'human': 'person', 'orc': 'orc-head', 'tiefling': 'devil-mask',
  # ability
  'str': 'biceps', 'dex': 'sprint', 'con': 'heart-beats', 'int': 'brain', 'wis': 'owl', 'cha': 'conversation',
  # สำนักเวท
  'Abjuration': 'magic-shield', 'Conjuration': 'magic-portal', 'Divination': 'crystal-ball',
  'Enchantment': 'charm', 'Evocation': 'fireball', 'Illusion': 'drama-masks',
  'Necromancy': 'skull-crossed-bones', 'Transmutation': 'transform',
  # ประเภทการใช้
  'action': 'sword-brandish', 'bonus': 'lightning-helix', 'reaction': 'shield-reflect', 'passive': 'aura',
  # UI
  'background': 'scroll-unfurled', 'feat': 'sparkles', 'spell': 'spell-book', 'gear': 'backpack',
  'coin': 'two-coins', 'd20': 'dice-twenty-faces-twenty', 'dice': 'rolling-dices', 'hp': 'heart-plus',
  'ac': 'checked-shield', 'speed': 'footprint', 'init': 'hourglass', 'short': 'campfire', 'long': 'night-sleep',
  'skill': 'magnifying-glass', 'weapon': 'broadsword', 'armor': 'chest-armor', 'shield': 'round-shield',
  'share': 'share', 'trash': 'trash-can', 'download': 'cloud-download', 'upload': 'cloud-upload',
  'edit': 'quill-ink', 'book': 'open-book', 'pack': 'swap-bag', 'crown': 'crown', 'flame': 'flame',
  'death': 'broken-heart', 'level': 'muscle-up', 'note': 'tied-scroll', 'eye': 'eye-target', 'compass': 'compass',
}
out = {k: SRC['icons'][v]['body'] for k, v in PICK.items()}
json.dump(out, open(sys.argv[2], 'w'), separators=(',', ':'))
print(len(out), 'icons')
