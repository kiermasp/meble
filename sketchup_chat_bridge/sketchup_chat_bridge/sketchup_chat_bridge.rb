# SketchUp Chat Bridge for SketchUp Make 2017
#
# Reads one JSON command from the workspace and applies only allowlisted model
# operations. Commands are exchanged through files so no network server or
# remote code evaluation is required.
#
# Axes (never rename these):
#   X = red  = szerokość / grubość boku
#   Y = green = głębokość (do tyłu szafy)
#   Z = blue  = góra, wysokość
#
# Furniture commands use millimetres. A standing cabinet side is:
#   thickness_mm along X, depth_mm along Y, height_mm along Z.
# The solid is always placed so its bottom sits on origin.z (floor when z=0).
#
# Finish (optional): board decor + per-edge banding with named edges, never 1-4.
#   standing: front -Y, back +Y, top +Z, bottom -Z (board on ±X)
#   flat:     front -Y, back +Y, left -X, right +X (board on ±Z)
# Holes are a field of the same panel (no create_hole). kind face|edge, type single.
# add_holes appends more drills to an existing panel group.

require 'sketchup.rb'
require 'json'
require 'fileutils'

module SketchupChatBridge
  BRIDGE_DIR = File.expand_path('~/Documents/ChatGPT/sketchup api/sketchup_chat_bridge')
  SOURCE_PATH = File.join(BRIDGE_DIR, 'sketchup_chat_bridge.rb')
  COMMAND_PATH = File.join(BRIDGE_DIR, 'command.json')
  PROCESSING_PATH = File.join(BRIDGE_DIR, 'command.processing.json')
  RESULT_PATH = File.join(BRIDGE_DIR, 'result.json')
  TIMER_TOKEN = 'SketchupChatBridge.timer'.freeze
  ATTR_DICT = 'ChatBridge'.freeze
  STANDING_EDGES = %w[front back top bottom].freeze
  FLAT_EDGES = %w[front back left right].freeze
  THIN_Y_EDGES = %w[left right top bottom].freeze
  GRAINS = %w[none na_szerokosc na_wysokosc].freeze
  GLUES = %w[neutral white].freeze
  COVERS = %w[long short].freeze
  DEFAULT_DECOR_HEX = {
    'W1000' => '#F4F1EA'
  }.freeze
  FALLBACK_HEX = '#F4F1EA'.freeze

  module_function

  def reload_if_changed
    return unless File.file?(SOURCE_PATH)
    mtime = File.mtime(SOURCE_PATH).to_f
    previous = SketchupChatBridge.instance_variable_get(:@source_mtime)
    return if previous == mtime
    load SOURCE_PATH
    SketchupChatBridge.instance_variable_set(:@source_mtime, mtime)
  end

  def round_mm(value)
    (value.to_f * 100.0).round / 100.0
  end

  def mm_array(length_values)
    length_values.map { |value| round_mm(value.to_mm) }
  end

  def require_xyz(values, field)
    unless values.is_a?(Array) && values.length == 3
      raise ArgumentError, "#{field} must be [x, y, z]"
    end
    values
  end

  def positive_mm(value, field)
    number = value.to_f
    raise ArgumentError, "#{field} must be greater than zero" unless number > 0
    number.mm
  end

  def normalize_orientation(orientation)
    case orientation.to_s
    when 'standing', 'pion'
      'standing'
    when 'flat', 'polka', 'leżąco', 'lezaco'
      'flat'
    else
      raise ArgumentError, "orientation must be standing or flat, got #{orientation.inspect}"
    end
  end

  def allowed_edges(orientation)
    case orientation
    when 'standing' then STANDING_EDGES
    when 'thin_y' then THIN_Y_EDGES
    else FLAT_EDGES
    end
  end

  def sanitize_token(text)
    token = text.to_s.gsub(/[^A-Za-z0-9]+/, '-').gsub(/^-|-$/, '')
    token.empty? ? 'X' : token
  end

  def hex_for_decor(decor, hex)
    return hex.to_s if hex && !hex.to_s.empty?
    DEFAULT_DECOR_HEX[decor.to_s] || FALLBACK_HEX
  end

  def color_from_hex(hex)
    text = hex.to_s.strip.sub(/^#/, '')
    unless text.length == 6 && text =~ /^[0-9A-Fa-f]{6}$/
      raise ArgumentError, "hex must be #RRGGBB, got #{hex.inspect}"
    end
    Sketchup::Color.new(text[0, 2].to_i(16), text[2, 2].to_i(16), text[4, 2].to_i(16))
  end

  def normalize_board(board)
    return nil if board.nil?
    unless board.is_a?(Hash)
      raise ArgumentError, 'board must be an object'
    end
    grain = (board['grain'] || 'none').to_s
    grain = 'none' if grain == 'bez_znaczenia' || grain == 'bez znaczenia'
    unless GRAINS.include?(grain)
      raise ArgumentError, "board.grain must be none, na_szerokosc or na_wysokosc"
    end
    spec = {
      'decor' => (board['decor'] || 'W1000').to_s,
      'grain' => grain
    }
    spec['structure'] = board['structure'].to_s unless board['structure'].nil? || board['structure'].to_s.empty?
    spec['hex'] = hex_for_decor(spec['decor'], board['hex'])
    spec
  end

  def normalize_edge_layer(layer, field)
    return nil if layer.nil?
    unless layer.is_a?(Hash)
      raise ArgumentError, "#{field} must be an object or null"
    end
    spec = {}
    spec['decor'] = layer['decor'].to_s unless layer['decor'].nil? || layer['decor'].to_s.empty?
    unless layer['thickness_mm'].nil?
      thickness = layer['thickness_mm'].to_f
      raise ArgumentError, "#{field}.thickness_mm must be greater than zero" unless thickness > 0
      spec['thickness_mm'] = round_mm(thickness)
    end
    spec['hex'] = layer['hex'].to_s unless layer['hex'].nil? || layer['hex'].to_s.empty?
    spec
  end

  def merge_edge_spec(default_spec, edge_spec)
    merged = {}
    merged['decor'] = default_spec['decor'] if default_spec && default_spec['decor']
    merged['thickness_mm'] = default_spec['thickness_mm'] if default_spec && default_spec['thickness_mm']
    merged['hex'] = default_spec['hex'] if default_spec && default_spec['hex']
    if edge_spec
      merged['decor'] = edge_spec['decor'] if edge_spec['decor']
      merged['thickness_mm'] = edge_spec['thickness_mm'] if edge_spec['thickness_mm']
      merged['hex'] = edge_spec['hex'] if edge_spec['hex']
    end
    merged['decor'] = 'W1000' if merged['decor'].nil? || merged['decor'].empty?
    merged['thickness_mm'] = 0.8 if merged['thickness_mm'].nil?
    merged['hex'] = hex_for_decor(merged['decor'], merged['hex'])
    merged
  end

  def normalize_edgeband(edgeband, orientation)
    return nil if edgeband.nil?
    unless edgeband.is_a?(Hash)
      raise ArgumentError, 'edgeband must be an object'
    end
    glue = (edgeband['glue'] || 'neutral').to_s
    cover = (edgeband['cover'] || 'long').to_s
    unless GLUES.include?(glue)
      raise ArgumentError, 'edgeband.glue must be neutral or white'
    end
    unless COVERS.include?(cover)
      raise ArgumentError, 'edgeband.cover must be long or short'
    end
    default_spec = normalize_edge_layer(edgeband['default'], 'edgeband.default')
    allowed = allowed_edges(orientation)
    edges_in = edgeband['edges']
    resolved = {}
    unless edges_in.nil?
      unless edges_in.is_a?(Hash)
        raise ArgumentError, 'edgeband.edges must be an object'
      end
      edges_in.each do |name, value|
        unless allowed.include?(name.to_s)
          raise ArgumentError, "unknown edge #{name.inspect} for #{orientation} (#{allowed.join(', ')})"
        end
        next if value.nil?
        edge_spec = normalize_edge_layer(value, "edgeband.edges.#{name}")
        resolved[name.to_s] = merge_edge_spec(default_spec, edge_spec)
      end
    end
    spec = {
      'glue' => glue,
      'cover' => cover,
      'edges' => resolved
    }
    spec['default'] = merge_edge_spec(nil, default_spec) if default_spec
    spec
  end

  def parse_finish(command, orientation)
    return nil unless command.key?('board') || command.key?('edgeband')
    finish = {}
    if command.key?('board')
      board = normalize_board(command['board'])
      finish['board'] = board if board
    end
    if command.key?('edgeband')
      edgeband = normalize_edgeband(command['edgeband'], orientation)
      finish['edgeband'] = edgeband if edgeband
    end
    finish.empty? ? nil : finish
  end

  def size_to_finished_mm(size_xyz)
    {
      'x' => round_mm(size_xyz[0].to_mm),
      'y' => round_mm(size_xyz[1].to_mm),
      'z' => round_mm(size_xyz[2].to_mm)
    }
  end

  def panel_thickness_mm(orientation, finished)
    case orientation.to_s
    when 'standing' then finished['x'].to_f
    when 'thin_y' then finished['y'].to_f
    else finished['z'].to_f
    end
  end

  def large_face_layout(orientation, finished)
    case orientation.to_s
    when 'standing'
      height = finished['z'].to_f
      depth = finished['y'].to_f
      if height >= depth
        { 'length_mm' => height, 'width_mm' => depth, 'x_dir' => 'z', 'y_dir' => 'y', 'x_origin' => 'bottom', 'y_origin' => 'front' }
      else
        { 'length_mm' => depth, 'width_mm' => height, 'x_dir' => 'y', 'y_dir' => 'z', 'x_origin' => 'front', 'y_origin' => 'bottom' }
      end
    when 'thin_y'
      height = finished['z'].to_f
      width = finished['x'].to_f
      if height >= width
        { 'length_mm' => height, 'width_mm' => width, 'x_dir' => 'z', 'y_dir' => 'x', 'x_origin' => 'bottom', 'y_origin' => 'left' }
      else
        { 'length_mm' => width, 'width_mm' => height, 'x_dir' => 'x', 'y_dir' => 'z', 'x_origin' => 'left', 'y_origin' => 'bottom' }
      end
    else
      width = finished['x'].to_f
      depth = finished['y'].to_f
      if width >= depth
        { 'length_mm' => width, 'width_mm' => depth, 'x_dir' => 'x', 'y_dir' => 'y', 'x_origin' => 'left', 'y_origin' => 'front' }
      else
        { 'length_mm' => depth, 'width_mm' => width, 'x_dir' => 'y', 'y_dir' => 'x', 'x_origin' => 'front', 'y_origin' => 'left' }
      end
    end
  end

  def edge_run(orientation, edge, finished)
    case orientation.to_s
    when 'standing'
      case edge
      when 'front', 'back' then { 'length_mm' => finished['z'].to_f, 'from' => 'bottom' }
      when 'top', 'bottom' then { 'length_mm' => finished['y'].to_f, 'from' => 'front' }
      else nil
      end
    when 'thin_y'
      case edge
      when 'left', 'right' then { 'length_mm' => finished['z'].to_f, 'from' => 'bottom' }
      when 'top', 'bottom' then { 'length_mm' => finished['x'].to_f, 'from' => 'left' }
      else nil
      end
    else
      case edge
      when 'left', 'right' then { 'length_mm' => finished['y'].to_f, 'from' => 'front' }
      when 'front', 'back' then { 'length_mm' => finished['x'].to_f, 'from' => 'left' }
      else nil
      end
    end
  end

  def axis_offset_vector(dir, mm_value)
    delta = mm_value.to_f.mm
    case dir
    when 'x' then Geom::Vector3d.new(delta, 0, 0)
    when 'y' then Geom::Vector3d.new(0, delta, 0)
    else Geom::Vector3d.new(0, 0, delta)
    end
  end

  def parse_holes(raw, orientation, finished, id_start = 0)
    return nil if raw.nil?
    unless raw.is_a?(Array)
      raise ArgumentError, 'holes must be an array on the panel'
    end
    holes = []
    raw.each_with_index do |item, index|
      holes << normalize_hole(item, orientation, finished, index, id_start)
    end
    holes.empty? ? nil : holes
  end

  def normalize_hole(item, orientation, finished, index, id_start = 0)
    unless item.is_a?(Hash)
      raise ArgumentError, "holes[#{index}] must be an object"
    end
    kind = item['kind'].to_s
    hole_type = (item['type'] || 'single').to_s
    unless hole_type == 'single'
      raise ArgumentError, "holes[#{index}].type must be single"
    end
    diameter = item['diameter_mm'].to_f
    raise ArgumentError, "holes[#{index}].diameter_mm must be greater than zero" unless diameter > 0
    spec = {
      'id' => item['id'] ? item['id'].to_s : "h#{id_start + index + 1}",
      'kind' => kind,
      'type' => 'single',
      'diameter_mm' => round_mm(diameter)
    }
    if kind == 'face'
      normalize_face_hole(spec, item, orientation, finished, index)
    elsif kind == 'edge'
      normalize_edge_hole(spec, item, orientation, finished, index)
    else
      raise ArgumentError, "holes[#{index}].kind must be face or edge"
    end
  end

  def normalize_face_hole(spec, item, orientation, finished, index)
    surface = item['surface'].to_s
    unless surface == 'front' || surface == 'back'
      raise ArgumentError, "holes[#{index}].surface must be front or back"
    end
    if item['x_mm'].nil? || item['y_mm'].nil?
      raise ArgumentError, "holes[#{index}] face hole needs x_mm and y_mm"
    end
    layout = large_face_layout(orientation, finished)
    x_mm = item['x_mm'].to_f
    y_mm = item['y_mm'].to_f
    radius = spec['diameter_mm'] / 2.0
    if x_mm < radius || y_mm < radius || x_mm > layout['length_mm'] - radius || y_mm > layout['width_mm'] - radius
      raise ArgumentError, "holes[#{index}] face center is outside the panel"
    end
    thickness = panel_thickness_mm(orientation, finished)
    through = item['through'] == true || item['depth_mm'].to_s == 'through'
    if through
      depth = thickness
    else
      raise ArgumentError, "holes[#{index}].depth_mm is required" if item['depth_mm'].nil?
      depth = item['depth_mm'].to_f
      raise ArgumentError, "holes[#{index}].depth_mm must be greater than zero" unless depth > 0
      through = depth >= thickness - 0.01
      depth = thickness if through
    end
    spec['surface'] = surface
    spec['x_mm'] = round_mm(x_mm)
    spec['y_mm'] = round_mm(y_mm)
    spec['depth_mm'] = round_mm(depth)
    spec['through'] = through
    spec
  end

  def normalize_edge_hole(spec, item, orientation, finished, index)
    edge = item['edge'].to_s
    run = edge_run(orientation, edge, finished)
    unless run
      raise ArgumentError, "holes[#{index}].edge #{edge.inspect} is not an edge of #{orientation}"
    end
    if item['from_mm'].nil?
      raise ArgumentError, "holes[#{index}] edge hole needs from_mm"
    end
    from_mm = item['from_mm'].to_f
    radius = spec['diameter_mm'] / 2.0
    if from_mm < radius || from_mm > run['length_mm'] - radius
      raise ArgumentError, "holes[#{index}] edge center is outside the edge"
    end
    raise ArgumentError, "holes[#{index}].depth_mm is required" if item['depth_mm'].nil? || item['depth_mm'].to_s == 'through'
    depth = item['depth_mm'].to_f
    raise ArgumentError, "holes[#{index}].depth_mm must be greater than zero" unless depth > 0
    spec['edge'] = edge
    spec['from_mm'] = round_mm(from_mm)
    spec['depth_mm'] = round_mm(depth)
    spec['through'] = false
    spec
  end

  def holes_for_export(holes, orientation, finished, finish)
    return nil if holes.nil? || holes.empty?
    holes.map { |hole| export_one_hole(hole, orientation, finished, finish) }
  end

  def export_one_hole(hole, orientation, finished, finish)
    exported = {}
    hole.each { |key, value| exported[key] = value }
    edges = (((finish || {})['edgeband'] || {})['edges']) || {}
    if hole['kind'] == 'face'
      layout = large_face_layout(orientation, finished)
      exported['x_cut_mm'] = clamp_cut(hole['x_mm'] - edge_mm(edges, layout['x_origin']))
      exported['y_cut_mm'] = clamp_cut(hole['y_mm'] - edge_mm(edges, layout['y_origin']))
    else
      run = edge_run(orientation, hole['edge'], finished)
      exported['from_cut_mm'] = clamp_cut(hole['from_mm'] - edge_mm(edges, run['from'])) if run
    end
    exported
  end

  def find_disk_face(edges)
    return nil if edges.nil? || edges.empty?
    faces = []
    edges.each do |edge|
      next unless edge.valid?
      edge.faces.each do |face|
        faces << face unless faces.include?(face)
      end
    end
    disk = nil
    smallest = nil
    faces.each do |face|
      area = face.area
      if smallest.nil? || area < smallest
        disk = face
        smallest = area
      end
    end
    disk
  end

  def drill_into_group(group, center, outward_normal, radius, depth)
    edges = group.entities.add_circle(center, outward_normal, radius, 24)
    disk = find_disk_face(edges)
    disk = group.entities.add_face(edges) if disk.nil?
    raise 'Could not create a hole in the panel' unless disk
    disk.reverse! unless disk.normal.samedirection?(outward_normal)
    disk.pushpull(-depth)
  end

  def face_center_and_normal(origin, size_xyz, orientation, surface, x_mm, y_mm, layout)
    point = Geom::Point3d.new(origin.x, origin.y, origin.z)
    point = point.offset(axis_offset_vector(layout['x_dir'], x_mm))
    point = point.offset(axis_offset_vector(layout['y_dir'], y_mm))
    width, depth, height = size_xyz
    if orientation == 'standing'
      if surface == 'front'
        point.x = origin.x + width
        [point, X_AXIS]
      else
        point.x = origin.x
        [point, X_AXIS.reverse]
      end
    elsif orientation == 'thin_y'
      if surface == 'front'
        point.y = origin.y
        [point, Y_AXIS.reverse]
      else
        point.y = origin.y + depth
        [point, Y_AXIS]
      end
    else
      if surface == 'front'
        point.z = origin.z + height
        [point, Z_AXIS]
      else
        point.z = origin.z
        [point, Z_AXIS.reverse]
      end
    end
  end

  def edge_center_and_normal(origin, size_xyz, orientation, edge, from_mm)
    ox, oy, oz = origin.x, origin.y, origin.z
    width, depth, height = size_xyz
    half_t = panel_thickness_mm(orientation, size_to_finished_mm(size_xyz)).to_f.mm / 2.0
    from = from_mm.to_f.mm
    case orientation
    when 'standing'
      case edge
      when 'front' then [Geom::Point3d.new(ox + half_t, oy, oz + from), Y_AXIS.reverse]
      when 'back' then [Geom::Point3d.new(ox + half_t, oy + depth, oz + from), Y_AXIS]
      when 'bottom' then [Geom::Point3d.new(ox + half_t, oy + from, oz), Z_AXIS.reverse]
      when 'top' then [Geom::Point3d.new(ox + half_t, oy + from, oz + height), Z_AXIS]
      end
    when 'thin_y'
      case edge
      when 'left' then [Geom::Point3d.new(ox, oy + half_t, oz + from), X_AXIS.reverse]
      when 'right' then [Geom::Point3d.new(ox + width, oy + half_t, oz + from), X_AXIS]
      when 'bottom' then [Geom::Point3d.new(ox + from, oy + half_t, oz), Z_AXIS.reverse]
      when 'top' then [Geom::Point3d.new(ox + from, oy + half_t, oz + height), Z_AXIS]
      end
    else
      case edge
      when 'left' then [Geom::Point3d.new(ox, oy + from, oz + half_t), X_AXIS.reverse]
      when 'right' then [Geom::Point3d.new(ox + width, oy + from, oz + half_t), X_AXIS]
      when 'front' then [Geom::Point3d.new(ox + from, oy, oz + half_t), Y_AXIS.reverse]
      when 'back' then [Geom::Point3d.new(ox + from, oy + depth, oz + half_t), Y_AXIS]
      end
    end
  end

  def paint_new_hole_faces(group, existing_ids, finish)
    return if finish.nil? || finish['edgeband'].nil?
    spec = finish['edgeband']['default']
    if spec.nil?
      edges = finish['edgeband']['edges'] || {}
      edges.each_value do |value|
        if value
          spec = value
          break
        end
      end
    end
    return if spec.nil?
    material = edge_material(Sketchup.active_model, spec)
    group.entities.grep(Sketchup::Face).each do |face|
      next if existing_ids[face.entityID]
      next unless face.edges.length == 4
      face.material = material
    end
  end

  def apply_holes(group, origin, size_xyz, orientation, holes, finish)
    return if holes.nil? || holes.empty?
    finished = size_to_finished_mm(size_xyz)
    layout = large_face_layout(orientation, finished)
    existing_ids = {}
    group.entities.each { |entity| existing_ids[entity.entityID] = true }
    holes.each do |hole|
      radius = (hole['diameter_mm'] / 2.0).mm
      depth = hole['depth_mm'].to_f.mm
      if hole['kind'] == 'face'
        center, normal = face_center_and_normal(origin, size_xyz, orientation, hole['surface'], hole['x_mm'], hole['y_mm'], layout)
      else
        center, normal = edge_center_and_normal(origin, size_xyz, orientation, hole['edge'], hole['from_mm'])
      end
      drill_into_group(group, center, normal, radius, depth)
    end
    paint_new_hole_faces(group, existing_ids, finish)
  end

  def store_panel_geometry(group, origin, size_xyz, orientation)
    group.set_attribute(ATTR_DICT, 'orientation', orientation)
    group.set_attribute(ATTR_DICT, 'finished_mm', JSON.generate(size_to_finished_mm(size_xyz)))
    group.set_attribute(ATTR_DICT, 'origin_mm', JSON.generate(mm_array([origin.x, origin.y, origin.z])))
  end

  def store_holes(group, holes)
    if holes.nil? || holes.empty?
      return
    end
    group.set_attribute(ATTR_DICT, 'holes', JSON.generate(holes))
  end

  def decorate_panel(group, origin, size_xyz, orientation, finish, holes)
    store_panel_geometry(group, origin, size_xyz, orientation)
    apply_finish(group, orientation, finish)
    apply_holes(group, origin, size_xyz, orientation, holes, finish)
    store_holes(group, holes)
  end

  def finished_from_entity(entity)
    raw = entity.get_attribute(ATTR_DICT, 'finished_mm')
    return nil if raw.nil? || raw.to_s.empty?
    parsed = JSON.parse(raw.to_s)
    parsed.is_a?(Hash) ? parsed : nil
  rescue JSON::ParserError
    nil
  end

  def holes_from_entity(entity)
    raw = entity.get_attribute(ATTR_DICT, 'holes')
    return nil if raw.nil? || raw.to_s.empty?
    JSON.parse(raw.to_s)
  rescue JSON::ParserError
    nil
  end

  def origin_mm_from_entity(entity)
    raw = entity.get_attribute(ATTR_DICT, 'origin_mm')
    return nil if raw.nil? || raw.to_s.empty?
    parsed = JSON.parse(raw.to_s)
    parsed.is_a?(Array) && parsed.length == 3 ? parsed : nil
  rescue JSON::ParserError
    nil
  end

  def local_entity_bounds(group)
    box = Geom::BoundingBox.new
    group.entities.each do |entity|
      next unless entity.valid? && entity.respond_to?(:bounds)
      box.add(entity.bounds)
    end
    box
  end

  def origin_from_entity(entity)
    stored = origin_mm_from_entity(entity)
    if stored
      return Geom::Point3d.new(stored[0].to_f.mm, stored[1].to_f.mm, stored[2].to_f.mm)
    end
    box = local_entity_bounds(entity)
    raise ArgumentError, 'panel has no geometry to drill' if box.empty?
    box.min
  end

  def size_xyz_from_finished(finished)
    [
      finished['x'].to_f.mm,
      finished['y'].to_f.mm,
      finished['z'].to_f.mm
    ]
  end

  def finished_for_panel(entity)
    stored = finished_from_entity(entity)
    return stored if stored
    box = local_entity_bounds(entity)
    raise ArgumentError, 'panel has no geometry to drill' if box.empty?
    {
      'x' => round_mm((box.max.x - box.min.x).to_mm),
      'y' => round_mm((box.max.y - box.min.y).to_mm),
      'z' => round_mm((box.max.z - box.min.z).to_mm)
    }
  end

  def require_panel_group(command)
    entity_id = command['entity_id'].to_i
    raise ArgumentError, 'entity_id is required' if entity_id <= 0
    entity = Sketchup.active_model.find_entity_by_id(entity_id)
    raise ArgumentError, "No entity found with id #{entity_id}" unless entity
    unless entity.is_a?(Sketchup::Group)
      raise ArgumentError, 'add_holes only works on a panel group'
    end
    entity
  end

  def panel_payload(group, operation)
    orientation = group.get_attribute(ATTR_DICT, 'orientation')
    finish = finish_from_entity(group)
    finished = finished_for_panel(group)
    holes = holes_from_entity(group)
    origin_mm = origin_mm_from_entity(group)
    if origin_mm.nil?
      origin = origin_from_entity(group)
      origin_mm = mm_array([origin.x, origin.y, origin.z])
    end
    data = {
      'entity_id' => group.entityID,
      'name' => group.name,
      'operation' => operation,
      'origin_mm' => origin_mm,
      'size_mm' => finished,
      'bounds_mm' => bounds_in_mm(group.bounds)
    }
    data['orientation'] = orientation unless orientation.nil? || orientation.to_s.empty?
    data['finish'] = finish if finish
    attach_cutting!(data, orientation, finished, finish)
    attach_holes!(data, holes, orientation, finished, finish)
    data
  end

  def add_holes(command)
    group = require_panel_group(command)
    if command['holes'].nil?
      raise ArgumentError, 'holes array is required'
    end
    orientation = group.get_attribute(ATTR_DICT, 'orientation')
    finished = finished_for_panel(group)
    if orientation.nil? || orientation.to_s.empty?
      orientation = box_finish_orientation(size_xyz_from_finished(finished))
    end
    existing = holes_from_entity(group) || []
    added = parse_holes(command['holes'], orientation, finished, existing.length)
    raise ArgumentError, 'holes must not be empty' if added.nil?
    used = {}
    existing.each { |hole| used[hole['id'].to_s] = true }
    added.each do |hole|
      if used[hole['id'].to_s]
        raise ArgumentError, "hole id #{hole['id'].inspect} already exists on this panel"
      end
      used[hole['id'].to_s] = true
    end
    origin = origin_from_entity(group)
    size_xyz = size_xyz_from_finished(finished)
    finish = finish_from_entity(group)
    model = Sketchup.active_model
    model.start_operation('Chat: Add Holes', true)
    store_panel_geometry(group, origin, size_xyz, orientation)
    apply_holes(group, origin, size_xyz, orientation, added, finish)
    store_holes(group, existing + added)
    model.commit_operation
    result = panel_payload(group, 'add_holes')
    result['added'] = holes_for_export(added, orientation, finished, finish)
    result
  rescue Exception
    model.abort_operation if model
    raise
  end

  def material_named(model, name, hex)
    materials = model.materials
    material = materials[name]
    material = materials.add(name) if material.nil?
    material.color = color_from_hex(hex)
    material
  end

  def board_material(model, board)
    name = "ChatBridge-Board-#{sanitize_token(board['decor'])}"
    material_named(model, name, board['hex'])
  end

  def edge_material(model, edge_spec)
    thick = sprintf('%.1f', edge_spec['thickness_mm']).gsub('.', 'p')
    name = "ChatBridge-Edge-#{sanitize_token(edge_spec['decor'])}-#{thick}"
    material_named(model, name, edge_spec['hex'])
  end

  def face_role(normal, orientation)
    ax = normal.x.abs
    ay = normal.y.abs
    az = normal.z.abs
    if orientation == 'standing'
      if ax >= ay && ax >= az
        'board'
      elsif ay >= az
        normal.y < 0 ? 'front' : 'back'
      else
        normal.z < 0 ? 'bottom' : 'top'
      end
    elsif orientation == 'thin_y'
      if ay >= ax && ay >= az
        'board'
      elsif ax >= az
        normal.x < 0 ? 'left' : 'right'
      else
        normal.z < 0 ? 'bottom' : 'top'
      end
    else
      if az >= ax && az >= ay
        'board'
      elsif ay >= ax
        normal.y < 0 ? 'front' : 'back'
      else
        normal.x < 0 ? 'left' : 'right'
      end
    end
  end

  def apply_finish(group, orientation, finish)
    return if finish.nil?
    model = Sketchup.active_model
    board = finish['board']
    edges = (finish['edgeband'] && finish['edgeband']['edges']) || {}
    group.entities.grep(Sketchup::Face).each do |face|
      role = face_role(face.normal, orientation)
      if role == 'board'
        face.material = board_material(model, board) if board
      elsif edges[role]
        face.material = edge_material(model, edges[role])
      end
    end
    group.set_attribute(ATTR_DICT, 'orientation', orientation)
    group.set_attribute(ATTR_DICT, 'finish', JSON.generate(finish))
  end

  def finish_from_entity(entity)
    raw = entity.get_attribute(ATTR_DICT, 'finish')
    return nil if raw.nil? || raw.to_s.empty?
    JSON.parse(raw.to_s)
  rescue JSON::ParserError
    nil
  end

  def edge_mm(edges, name)
    spec = edges[name]
    return 0.0 if spec.nil?
    spec['thickness_mm'].to_f
  end

  def clamp_cut(value)
    number = round_mm(value)
    number < 0 ? 0.0 : number
  end

  def cut_blank_mm(orientation, cut)
    case orientation.to_s
    when 'standing'
      side_a, side_b, thickness = cut['y'], cut['z'], cut['x']
    when 'thin_y'
      side_a, side_b, thickness = cut['x'], cut['z'], cut['y']
    else
      side_a, side_b, thickness = cut['x'], cut['y'], cut['z']
    end
    length = side_a > side_b ? side_a : side_b
    width = side_a > side_b ? side_b : side_a
    {
      'length_mm' => round_mm(length),
      'width_mm' => round_mm(width),
      'thickness_mm' => round_mm(thickness)
    }
  end

  # Model size is the finished / assembled size. Cut is the raw board for the saw.
  def cutting_sizes(orientation, finished, finish)
    finished_xyz = {
      'x' => round_mm(finished['x'].to_f),
      'y' => round_mm(finished['y'].to_f),
      'z' => round_mm(finished['z'].to_f)
    }
    edges = (((finish || {})['edgeband'] || {})['edges']) || {}
    fx = finished_xyz['x']
    fy = finished_xyz['y']
    fz = finished_xyz['z']
    cut = case orientation.to_s
    when 'standing'
      {
        'x' => fx,
        'y' => clamp_cut(fy - edge_mm(edges, 'front') - edge_mm(edges, 'back')),
        'z' => clamp_cut(fz - edge_mm(edges, 'top') - edge_mm(edges, 'bottom'))
      }
    when 'thin_y'
      {
        'x' => clamp_cut(fx - edge_mm(edges, 'left') - edge_mm(edges, 'right')),
        'y' => fy,
        'z' => clamp_cut(fz - edge_mm(edges, 'top') - edge_mm(edges, 'bottom'))
      }
    when 'flat'
      {
        'x' => clamp_cut(fx - edge_mm(edges, 'left') - edge_mm(edges, 'right')),
        'y' => clamp_cut(fy - edge_mm(edges, 'front') - edge_mm(edges, 'back')),
        'z' => fz
      }
    else
      { 'x' => fx, 'y' => fy, 'z' => fz }
    end
    {
      'finished_mm' => finished_xyz,
      'cut_mm' => cut,
      'cut_blank_mm' => cut_blank_mm(orientation, cut)
    }
  end

  def attach_cutting!(data, orientation, finished, finish)
    return data if orientation.nil? || orientation.to_s.empty? || finished.nil?
    cutting = cutting_sizes(orientation, finished, finish)
    data['finished_mm'] = cutting['finished_mm']
    data['cut_mm'] = cutting['cut_mm']
    data['cut_blank_mm'] = cutting['cut_blank_mm']
    data
  end

  def attach_holes!(data, holes, orientation, finished, finish)
    exported = holes_for_export(holes, orientation, finished, finish)
    data['holes'] = exported if exported
    data
  end

  def origin_from_command(command)
    if command.key?('origin_mm')
      values = require_xyz(command['origin_mm'], 'origin_mm')
      Geom::Point3d.new(values[0].to_f.mm, values[1].to_f.mm, values[2].to_f.mm)
    elsif command.key?('origin_m')
      values = require_xyz(command['origin_m'], 'origin_m')
      Geom::Point3d.new(values[0].to_f.m, values[1].to_f.m, values[2].to_f.m)
    else
      Geom::Point3d.new(0, 0, 0)
    end
  end

  def xyz_lengths_from_command(command)
    if command.key?('dimensions_mm')
      values = require_xyz(command['dimensions_mm'], 'dimensions_mm')
      [
        positive_mm(values[0], 'dimensions_mm[0] (X)'),
        positive_mm(values[1], 'dimensions_mm[1] (Y)'),
        positive_mm(values[2], 'dimensions_mm[2] (Z)')
      ]
    elsif command.key?('dimensions_m')
      values = require_xyz(command['dimensions_m'], 'dimensions_m')
      [
        positive_mm(values[0].to_f * 1000.0, 'dimensions_m[0] (X)'),
        positive_mm(values[1].to_f * 1000.0, 'dimensions_m[1] (Y)'),
        positive_mm(values[2].to_f * 1000.0, 'dimensions_m[2] (Z)')
      ]
    else
      raise ArgumentError, 'provide dimensions_mm [x, y, z] in millimetres'
    end
  end

  # Builds a box in +X, +Y, +Z and lifts it so the bottom sits on origin.z.
  def create_axis_aligned_box(origin, size_xyz, name, operation)
    width, depth, height = size_xyz
    model = Sketchup.active_model
    model.start_operation("Chat: #{operation}", true)
    group = model.active_entities.add_group
    group.name = name.to_s unless name.nil? || name.to_s.empty?
    face = group.entities.add_face(
      origin,
      origin.offset(X_AXIS, width),
      origin.offset(X_AXIS, width).offset(Y_AXIS, depth),
      origin.offset(Y_AXIS, depth)
    )
    raise 'Could not create the box base face' unless face
    face.reverse! if face.normal.z < 0
    face.pushpull(height)
    lift = origin.z - group.bounds.min.z
    if lift.abs > 1e-8
      group.transform!(Geom::Transformation.new([0, 0, lift]))
    end
    yield group if block_given?
    model.commit_operation
    {
      'entity_id' => group.entityID,
      'name' => group.name,
      'operation' => operation,
      'origin_mm' => mm_array([origin.x, origin.y, origin.z]),
      'size_mm' => {
        'x' => round_mm(width.to_mm),
        'y' => round_mm(depth.to_mm),
        'z' => round_mm(height.to_mm)
      },
      'bounds_mm' => bounds_in_mm(group.bounds)
    }
  rescue Exception
    model.abort_operation if model
    raise
  end

  def box_finish_orientation(size_xyz)
    xs = size_xyz[0].to_mm
    ys = size_xyz[1].to_mm
    zs = size_xyz[2].to_mm
    if xs <= ys && xs <= zs
      'standing'
    elsif zs <= xs && zs <= ys
      'flat'
    else
      'thin_y'
    end
  end

  def create_box(command)
    origin = origin_from_command(command)
    size_xyz = xyz_lengths_from_command(command)
    orientation = box_finish_orientation(size_xyz)
    finish = parse_finish(command, orientation)
    holes = parse_holes(command['holes'], orientation, size_to_finished_mm(size_xyz))
    result = create_axis_aligned_box(origin, size_xyz, command['name'], 'create_box') do |group|
      decorate_panel(group, origin, size_xyz, orientation, finish, holes)
    end
    result['orientation'] = orientation
    result['finish'] = finish if finish
    attach_cutting!(result, orientation, result['size_mm'], finish)
    attach_holes!(result, holes, orientation, result['size_mm'], finish)
    result
  end

  # Standing furniture panel. Default: pionowa płyta na podłodze.
  # standing: X=thickness_mm, Y=depth_mm, Z=height_mm
  # flat:     X=width_mm,      Y=depth_mm, Z=thickness_mm  (półka)
  def create_panel(command)
    orientation = normalize_orientation(command['orientation'] || 'standing')
    thickness = command['thickness_mm']
    depth = command['depth_mm']
    raise ArgumentError, 'thickness_mm is required' if thickness.nil?
    raise ArgumentError, 'depth_mm is required' if depth.nil?
    finish = parse_finish(command, orientation)

    if orientation == 'standing'
      height = command['height_mm']
      raise ArgumentError, 'height_mm is required for a standing panel' if height.nil?
      size_xyz = [
        positive_mm(thickness, 'thickness_mm (X)'),
        positive_mm(depth, 'depth_mm (Y)'),
        positive_mm(height, 'height_mm (Z)')
      ]
    else
      width = command['width_mm']
      raise ArgumentError, 'width_mm is required for a flat panel' if width.nil?
      size_xyz = [
        positive_mm(width, 'width_mm (X)'),
        positive_mm(depth, 'depth_mm (Y)'),
        positive_mm(thickness, 'thickness_mm (Z)')
      ]
    end

    origin = origin_from_command(command)
    holes = parse_holes(command['holes'], orientation, size_to_finished_mm(size_xyz))
    result = create_axis_aligned_box(origin, size_xyz, command['name'], 'create_panel') do |group|
      decorate_panel(group, origin, size_xyz, orientation, finish, holes)
    end
    result['orientation'] = orientation
    result['finish'] = finish if finish
    attach_cutting!(result, orientation, result['size_mm'], finish)
    attach_holes!(result, holes, orientation, result['size_mm'], finish)
    result
  end

  def delete_entity(command)
    entity_id = command['entity_id'].to_i
    raise ArgumentError, 'entity_id is required' if entity_id <= 0
    entity = Sketchup.active_model.find_entity_by_id(entity_id)
    raise ArgumentError, "No entity found with id #{entity_id}" unless entity
    model = Sketchup.active_model
    model.start_operation('Chat: Delete Entity', true)
    entity.parent.entities.erase_entities(entity)
    model.commit_operation
    { 'entity_id' => entity_id, 'operation' => 'delete_entity' }
  rescue Exception
    model.abort_operation if model
    raise
  end

  def bounds_in_mm(bounds)
    min = bounds.min
    max = bounds.max
    {
      'min_mm' => mm_array([min.x, min.y, min.z]),
      'max_mm' => mm_array([max.x, max.y, max.z]),
      'size_mm' => {
        'x' => round_mm((max.x - min.x).to_mm),
        'y' => round_mm((max.y - min.y).to_mm),
        'z' => round_mm((max.z - min.z).to_mm)
      }
    }
  end

  def inspect_model(command)
    model = Sketchup.active_model
    detail = (command['detail'] || 'parts').to_s
    entities = model.active_entities.map do |entity|
      next unless entity.valid? && entity.respond_to?(:bounds)
      named = entity.respond_to?(:name) && !entity.name.to_s.empty?
      part = entity.is_a?(Sketchup::Group) || entity.is_a?(Sketchup::ComponentInstance)
      next if detail != 'all' && !part && !named
      data = {
        'entity_id' => entity.entityID,
        'type' => entity.typename,
        'bounds_mm' => bounds_in_mm(entity.bounds)
      }
      data['name'] = entity.name if named
      orientation = entity.get_attribute(ATTR_DICT, 'orientation')
      data['orientation'] = orientation unless orientation.nil? || orientation.to_s.empty?
      finish = finish_from_entity(entity)
      data['finish'] = finish if finish
      finished = finished_from_entity(entity) || data['bounds_mm']['size_mm']
      attach_cutting!(data, orientation, finished, finish)
      attach_holes!(data, holes_from_entity(entity), orientation, finished, finish)
      data
    end.compact
    {
      'operation' => 'inspect_model',
      'axes' => 'X red / Y green / Z blue up. size_mm.z is height.',
      'units' => 'mm',
      'model_bounds_mm' => bounds_in_mm(model.bounds),
      'size_role' => 'model_is_finished',
      'entities' => entities
    }
  end

  def hole_group_key(holes)
    list = holes || []
    sorted = list.sort_by do |hole|
      [
        hole['kind'].to_s,
        hole['surface'].to_s,
        hole['edge'].to_s,
        hole['x_mm'].to_f,
        hole['y_mm'].to_f,
        hole['from_mm'].to_f,
        hole['diameter_mm'].to_f,
        hole['depth_mm'].to_f,
        hole['through'] ? 1 : 0
      ]
    end
    sorted.map do |hole|
      [
        hole['kind'],
        hole['diameter_mm'],
        hole['depth_mm'],
        hole['through'] ? true : false,
        hole['surface'],
        hole['x_mm'],
        hole['y_mm'],
        hole['edge'],
        hole['from_mm']
      ]
    end
  end

  def cut_group_key(part)
    edges = ((part['edgeband'] || {})['edges']) || {}
    edge_pairs = edges.keys.sort.map do |name|
      spec = edges[name] || {}
      [name, spec['decor'], spec['thickness_mm']]
    end
    board = part['board'] || {}
    JSON.generate([
      part['orientation'],
      part['finished_mm'],
      part['cut_mm'],
      part['cut_blank_mm'],
      board['decor'],
      board['structure'],
      board['grain'],
      (part['edgeband'] || {})['glue'],
      (part['edgeband'] || {})['cover'],
      edge_pairs,
      hole_group_key(part['holes'])
    ])
  end

  def cut_list(command)
    payload = inspect_model('detail' => 'parts')
    parts = payload['entities'].map do |entity|
      next if entity['cut_blank_mm'].nil?
      part = {
        'name' => entity['name'],
        'entity_id' => entity['entity_id'],
        'orientation' => entity['orientation'],
        'finished_mm' => entity['finished_mm'],
        'cut_mm' => entity['cut_mm'],
        'cut_blank_mm' => entity['cut_blank_mm']
      }
      finish = entity['finish']
      if finish
        part['board'] = finish['board'] if finish['board']
        part['edgeband'] = finish['edgeband'] if finish['edgeband']
      end
      part['holes'] = entity['holes'] if entity['holes']
      part
    end.compact

    grouped = command['group'] != false
    if grouped
      buckets = []
      index_by_key = {}
      parts.each do |part|
        key = cut_group_key(part)
        if index_by_key[key]
          bucket = buckets[index_by_key[key]]
          bucket['qty'] += 1
          bucket['names'] << part['name'] if part['name']
          bucket['entity_ids'] << part['entity_id']
        else
          index_by_key[key] = buckets.length
          buckets << {
            'name' => part['name'],
            'qty' => 1,
            'names' => part['name'] ? [part['name']] : [],
            'entity_ids' => [part['entity_id']],
            'orientation' => part['orientation'],
            'finished_mm' => part['finished_mm'],
            'cut_mm' => part['cut_mm'],
            'cut_blank_mm' => part['cut_blank_mm'],
            'board' => part['board'],
            'edgeband' => part['edgeband']
          }
          buckets.last['holes'] = part['holes'] if part['holes']
        end
      end
      parts = buckets
    else
      parts.each { |part| part['qty'] = 1 }
    end

    qty_total = 0
    parts.each { |part| qty_total += part['qty'].to_i }
    {
      'operation' => 'cut_list',
      'units' => 'mm',
      'size_role' => 'model_is_finished',
      'grouped' => grouped,
      'line_count' => parts.length,
      'qty_total' => qty_total,
      'parts' => parts
    }
  end

  def set_display(command)
    style = (command['style'] || 'shaded_with_textures').to_s
    action = case style
    when 'shaded'
      'viewShaded:'
    when 'shaded_with_textures', 'textures'
      'viewShadedTextures:'
    when 'hidden_line'
      'viewHiddenLine:'
    when 'wireframe'
      'viewWireframe:'
    when 'monochrome'
      'viewMonochrome:'
    else
      raise ArgumentError, "Unknown display style #{style.inspect}"
    end
    sent = Sketchup.send_action(action)
    { 'operation' => 'set_display', 'style' => style, 'sent' => sent ? true : false }
  end

  def execute(command)
    case command['operation']
    when 'create_box' then create_box(command)
    when 'create_panel' then create_panel(command)
    when 'add_holes' then add_holes(command)
    when 'create_hole'
      raise ArgumentError, 'holes belong on create_panel/create_box/add_holes; there is no create_hole'
    when 'delete_entity' then delete_entity(command)
    when 'inspect_model' then inspect_model(command)
    when 'cut_list' then cut_list(command)
    when 'set_display' then set_display(command)
    else
      raise ArgumentError, "Unsupported operation: #{command['operation'].inspect}"
    end
  end

  def write_result(data)
    temp_path = RESULT_PATH + '.tmp'
    File.open(temp_path, 'w') { |file| file.write(JSON.pretty_generate(data)) }
    File.rename(temp_path, RESULT_PATH)
  end

  def process_command
    reload_if_changed
    return unless File.exist?(COMMAND_PATH)
    return if File.exist?(PROCESSING_PATH)
    File.rename(COMMAND_PATH, PROCESSING_PATH)
    command = JSON.parse(File.read(PROCESSING_PATH))
    response = { 'ok' => true, 'command_id' => command['id'], 'result' => execute(command) }
    write_result(response)
  rescue Exception => error
    write_result({
      'ok' => false,
      'error' => error.message,
      'error_class' => error.class.to_s
    })
  ensure
    File.delete(PROCESSING_PATH) if File.exist?(PROCESSING_PATH)
  end

  unless file_loaded?(TIMER_TOKEN)
    FileUtils.mkdir_p(BRIDGE_DIR)
    SketchupChatBridge.instance_variable_set(:@source_mtime, File.mtime(SOURCE_PATH).to_f) if File.file?(SOURCE_PATH)
    UI.start_timer(1.0, true) { SketchupChatBridge.process_command }
    UI.menu('Extensions').add_item('Chat Bridge: Process Command Now') { SketchupChatBridge.process_command }
    file_loaded(TIMER_TOKEN)
  end
end
