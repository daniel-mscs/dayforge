package com.daniel.workout.model;

import jakarta.persistence.*;
import lombok.Data;
import java.util.List;

@Entity
@Data
public class Treino {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String nome; // Ex: Treino A

    @OneToMany(cascade = CascadeType.ALL)
    @JoinColumn(name = "treino_id")
    private List<Exercicio> exercicios;
}