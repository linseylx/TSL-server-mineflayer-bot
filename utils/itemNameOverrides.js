const materials = {
  oak: '橡木',
  spruce: '云杉木',
  birch: '白桦木',
  jungle: '丛林木',
  acacia: '金合欢木',
  dark_oak: '深色橡木',
  mangrove: '红树木',
  cherry: '樱花木',
  pale_oak: '苍白橡木',
  bamboo: '竹',
  crimson: '绯红',
  warped: '诡异'
};

const suffixes = [
  ['stripped_', 'log', '去皮{m}原木'],
  ['stripped_', 'wood', '去皮{m}木'],
  ['', 'log', '{m}原木'],
  ['', 'wood', '{m}木'],
  ['', 'planks', '{m}木板'],
  ['', 'stairs', '{m}楼梯'],
  ['', 'slab', '{m}台阶'],
  ['', 'fence_gate', '{m}栅栏门'],
  ['', 'fence', '{m}栅栏'],
  ['', 'door', '{m}门'],
  ['', 'trapdoor', '{m}活板门'],
  ['', 'pressure_plate', '{m}压力板'],
  ['', 'button', '{m}按钮'],
  ['', 'sapling', '{m}树苗'],
  ['', 'sign', '{m}告示牌'],
  ['', 'hanging_sign', '{m}悬挂式告示牌'],
  ['', 'leaves', '{m}树叶']
];

const colors = {
  white: '白色',
  orange: '橙色',
  magenta: '品红色',
  light_blue: '淡蓝色',
  yellow: '黄色',
  lime: '黄绿色',
  pink: '粉红色',
  gray: '灰色',
  light_gray: '淡灰色',
  cyan: '青色',
  purple: '紫色',
  blue: '蓝色',
  brown: '棕色',
  green: '绿色',
  red: '红色',
  black: '黑色'
};

function overrideItemName(name) {
  const key = String(name || '').replace(/^minecraft:/, '').trim();
  if (!key) return '';

  for (const [materialKey, materialName] of Object.entries(materials)) {
    for (const [prefix, suffix, template] of suffixes) {
      if (key === `${prefix}${materialKey}_${suffix}`) {
        return template.replace('{m}', materialName);
      }
    }
  }

  for (const [colorKey, colorName] of Object.entries(colors)) {
    if (key === `${colorKey}_stained_glass`) return `${colorName}染色玻璃`;
    if (key === `${colorKey}_stained_glass_pane`) return `${colorName}染色玻璃片`;
    if (key === `${colorKey}_concrete`) return `${colorName}混凝土`;
    if (key === `${colorKey}_concrete_powder`) return `${colorName}混凝土粉末`;
    if (key === `${colorKey}_wool`) return `${colorName}羊毛`;
    if (key === `${colorKey}_carpet`) return `${colorName}地毯`;
    if (key === `${colorKey}_terracotta`) return `${colorName}陶瓦`;
    if (key === `${colorKey}_glazed_terracotta`) return `${colorName}带釉陶瓦`;
    if (key === `${colorKey}_dye`) return `${colorName}染料`;
    if (key === `${colorKey}_shulker_box`) return `${colorName}潜影盒`;
  }

  const direct = {
    shulker_box: '潜影盒',
    chest: '箱子',
    trapped_chest: '陷阱箱',
    barrel: '木桶',
    smooth_quartz_stairs: '平滑石英楼梯',
    tinted_glass: '遮光玻璃'
  };
  return direct[key] || '';
}

module.exports = { overrideItemName };
