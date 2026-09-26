import { EDGE_SIDES, GRAIN_DIRECTIONS } from "@meble/domain";
import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
  registerDecorator,
  type ValidationArguments,
  type ValidationOptions,
} from "class-validator";

function UniqueEdgeSides(validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      name: "uniqueEdgeSides",
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          if (!Array.isArray(value)) return true;
          const sides = value.map((edge: { side?: string }) => edge?.side);
          return new Set(sides).size === sides.length;
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property}: każdy bok formatki może mieć tylko jedno obrzeże.`;
        },
      },
    });
  };
}

export class PieceEdgeDto {
  /** Bok formatki: top, bottom, left albo right. */
  @IsIn([...EDGE_SIDES], {
    message: "Bok obrzeża (side) musi być jednym z: top, bottom, left, right.",
  })
  side!: (typeof EDGE_SIDES)[number];

  /** Kod obrzeża z katalogu. Puste, gdy bok zostaje bez okleiny. */
  @IsOptional()
  @IsString({ message: "Odwołanie obrzeża (materialReference) musi być tekstem." })
  @IsNotEmpty({ message: "Odwołanie obrzeża (materialReference) nie może być puste." })
  @MaxLength(120, { message: "Odwołanie obrzeża (materialReference) jest za długie." })
  materialReference?: string | null;

  /** Grubość obrzeża w milimetrach. */
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: "Grubość obrzeża (thicknessMm) musi być liczbą." })
  @Min(0.1, { message: "Grubość obrzeża (thicknessMm) musi być większa od zera." })
  @Max(10, { message: "Grubość obrzeża (thicknessMm) nie może przekraczać 10 mm." })
  thicknessMm?: number | null;
}

export class PieceHoleDto {
  /** Odległość od lewej krawędzi formatki, w milimetrach. */
  @Type(() => Number)
  @IsNumber({}, { message: "Pozycja otworu (xMm) musi być liczbą." })
  @Min(0, { message: "Pozycja otworu (xMm) nie może być ujemna." })
  @Max(10000, { message: "Pozycja otworu (xMm) nie może przekraczać 10000 mm." })
  xMm!: number;

  /** Odległość od dolnej krawędzi formatki, w milimetrach. */
  @Type(() => Number)
  @IsNumber({}, { message: "Pozycja otworu (yMm) musi być liczbą." })
  @Min(0, { message: "Pozycja otworu (yMm) nie może być ujemna." })
  @Max(10000, { message: "Pozycja otworu (yMm) nie może przekraczać 10000 mm." })
  yMm!: number;

  /** Średnica otworu w milimetrach. */
  @Type(() => Number)
  @IsNumber({}, { message: "Średnica otworu (diameterMm) musi być liczbą." })
  @Min(0.1, { message: "Średnica otworu (diameterMm) musi być większa od zera." })
  @Max(200, { message: "Średnica otworu (diameterMm) nie może przekraczać 200 mm." })
  diameterMm!: number;

  /** Głębokość otworu w milimetrach. Null oznacza otwór na wylot. */
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: "Głębokość otworu (depthMm) musi być liczbą albo null (otwór na wylot)." })
  @Min(0.1, { message: "Głębokość otworu (depthMm) musi być większa od zera." })
  @Max(200, { message: "Głębokość otworu (depthMm) nie może przekraczać 200 mm." })
  depthMm?: number | null;
}

export class CuttingPieceDto {
  /** Szerokość formatki w milimetrach. */
  @Type(() => Number)
  @IsNumber({}, { message: "Szerokość (widthMm) musi być liczbą." })
  @Min(0.1, { message: "Szerokość (widthMm) musi być większa od zera." })
  @Max(10000, { message: "Szerokość (widthMm) nie może przekraczać 10000 mm." })
  widthMm!: number;

  /** Wysokość formatki w milimetrach. Usłojenie along-length biegnie wzdłuż tej krawędzi. */
  @Type(() => Number)
  @IsNumber({}, { message: "Wysokość (heightMm) musi być liczbą." })
  @Min(0.1, { message: "Wysokość (heightMm) musi być większa od zera." })
  @Max(10000, { message: "Wysokość (heightMm) nie może przekraczać 10000 mm." })
  heightMm!: number;

  /** Grubość płyty w milimetrach. */
  @Type(() => Number)
  @IsNumber({}, { message: "Grubość (thicknessMm) musi być liczbą." })
  @Min(0.1, { message: "Grubość (thicknessMm) musi być większa od zera." })
  @Max(100, { message: "Grubość (thicknessMm) nie może przekraczać 100 mm." })
  thicknessMm!: number;

  /** Liczba takich samych formatek. */
  @Type(() => Number)
  @IsInt({ message: "Ilość (quantity) musi być liczbą całkowitą." })
  @Min(1, { message: "Ilość (quantity) musi być co najmniej 1." })
  @Max(9999, { message: "Ilość (quantity) nie może przekraczać 9999." })
  quantity!: number;

  /** Identyfikator wiersza materials. Jedna płyta do kupienia: kategoria i kod sklepu, z grubością i strukturą na tym wierszu. */
  @IsUUID("4", { message: "Identyfikator płyty (materialId) musi być UUID z katalogu materials." })
  materialId!: string;

  /**
   * Usłojenie: along-length (wzdłuż wysokości), along-width (wzdłuż szerokości) albo none (brak).
   */
  @IsIn([...GRAIN_DIRECTIONS], {
    message: "Usłojenie (grain) musi być jednym z: along-length, along-width, none.",
  })
  grain!: (typeof GRAIN_DIRECTIONS)[number];

  /** Obrzeża formatki. Pusta tablica oznacza brak oklejania. */
  @IsArray({ message: "Obrzeża (edges) muszą być tablicą." })
  @ArrayMaxSize(4, { message: "Formatka może mieć najwyżej cztery obrzeża." })
  @ValidateNested({ each: true })
  @Type(() => PieceEdgeDto)
  @UniqueEdgeSides({ message: "Każdy bok formatki może mieć tylko jedno obrzeże." })
  edges!: PieceEdgeDto[];

  /** Otwory formatki. Pusta tablica oznacza brak wiercenia. */
  @IsArray({ message: "Otwory (holes) muszą być tablicą." })
  @ValidateNested({ each: true })
  @Type(() => PieceHoleDto)
  holes!: PieceHoleDto[];
}

export class CuttingOrderBodyDto {
  /** Formatki zaparkowanego rozkroju. Pusta tablica zostawia sam nagłówek. */
  @IsArray({ message: "Formatki (pieces) muszą być tablicą." })
  @ValidateNested({ each: true })
  @Type(() => CuttingPieceDto)
  pieces!: CuttingPieceDto[];
}
