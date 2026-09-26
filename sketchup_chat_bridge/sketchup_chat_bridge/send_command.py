#!/usr/bin/env python3
"""Send one JSON command to the SketchUp chat bridge and print the result."""

from __future__ import print_function

import argparse
import json
import os
import sys
import time
import uuid

BRIDGE_DIR = os.path.dirname(os.path.abspath(__file__))
COMMAND_PATH = os.path.join(BRIDGE_DIR, "command.json")
RESULT_PATH = os.path.join(BRIDGE_DIR, "result.json")


def send(payload, timeout=10):
    payload = dict(payload)
    payload.setdefault("id", uuid.uuid4().hex[:8])
    old_mtime = os.path.getmtime(RESULT_PATH) if os.path.exists(RESULT_PATH) else 0
    tmp_path = COMMAND_PATH + ".tmp"
    with open(tmp_path, "w") as handle:
        json.dump(payload, handle, indent=2)
        handle.write("\n")
    os.replace(tmp_path, COMMAND_PATH)
    deadline = time.time() + timeout
    while time.time() < deadline:
        if os.path.exists(RESULT_PATH) and os.path.getmtime(RESULT_PATH) > old_mtime:
            with open(RESULT_PATH) as handle:
                return json.load(handle)
        time.sleep(0.15)
    raise TimeoutError("SketchUp did not respond via result.json")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="cmd", required=True)

    sub.add_parser("inspect", help="List groups/components in millimetres")
    sub.add_parser("cut-list", help="Finished vs cut blanks for a cutting API")

    panel = sub.add_parser("panel", help="Create a furniture panel")
    panel.add_argument("--name", default="Panel")
    panel.add_argument("--orientation", choices=("standing", "flat"), default="standing")
    panel.add_argument("--thickness", type=float, required=True, help="mm")
    panel.add_argument("--depth", type=float, required=True, help="mm")
    panel.add_argument("--height", type=float, help="mm, required when standing")
    panel.add_argument("--width", type=float, help="mm, required when flat")
    panel.add_argument("--x", type=float, default=0, help="origin X mm")
    panel.add_argument("--y", type=float, default=0, help="origin Y mm")
    panel.add_argument("--z", type=float, default=0, help="origin Z mm")

    delete = sub.add_parser("delete", help="Delete an entity by id")
    delete.add_argument("entity_id", type=int)

    add_holes = sub.add_parser("add-holes", help="Drill more holes into an existing panel")
    add_holes.add_argument("entity_id", type=int)
    add_holes.add_argument(
        "--holes",
        required=True,
        help="JSON array of hole objects (same schema as create_panel holes)",
    )

    args = parser.parse_args()
    if args.cmd == "inspect":
        payload = {"operation": "inspect_model"}
    elif args.cmd == "cut-list":
        payload = {"operation": "cut_list"}
    elif args.cmd == "panel":
        payload = {
            "operation": "create_panel",
            "name": args.name,
            "orientation": args.orientation,
            "thickness_mm": args.thickness,
            "depth_mm": args.depth,
            "origin_mm": [args.x, args.y, args.z],
        }
        if args.orientation == "standing":
            if args.height is None:
                parser.error("standing panel requires --height")
            payload["height_mm"] = args.height
        else:
            if args.width is None:
                parser.error("flat panel requires --width")
            payload["width_mm"] = args.width
    elif args.cmd == "add-holes":
        try:
            holes = json.loads(args.holes)
        except ValueError as error:
            parser.error("invalid --holes JSON: %s" % error)
        payload = {
            "operation": "add_holes",
            "entity_id": args.entity_id,
            "holes": holes,
        }
    else:
        payload = {"operation": "delete_entity", "entity_id": args.entity_id}

    result = send(payload)
    json.dump(result, sys.stdout, indent=2)
    sys.stdout.write("\n")
    if not result.get("ok"):
        sys.exit(1)


if __name__ == "__main__":
    main()
